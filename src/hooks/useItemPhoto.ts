import { useState, useEffect } from "react";
import { API_BASE } from "../constants/api";

// ---------------------------------------------------------------------------
// Module-level cache
// photoCache   : final result per query  (null = confirmed no result)
// promiseCache : shared promise per query — prevents duplicate fetches and is
//                safe under React StrictMode double-effect invocation
// ---------------------------------------------------------------------------
const photoCache = new Map<string, string | null>();
const promiseCache = new Map<string, Promise<string | null>>();

interface GeoContext {
  name: string;
  lat: number;
  lon: number;
}

// ---------------------------------------------------------------------------
// Type-based generic queries — Level 3 fallback.
// These are common Unsplash terms that will virtually always return a result,
// ensuring every card has a photo regardless of destination obscurity.
// ---------------------------------------------------------------------------
const TYPE_QUERY: Record<string, string> = {
  activity:  "travel landmark sightseeing",
  food:      "restaurant local cuisine dining",
  stay:      "hotel resort accommodation room",
  transport: "scenic road journey travel",
};
const DEFAULT_TYPE_QUERY = "travel destination";

// ---------------------------------------------------------------------------
// Title normalisation — strip action verbs to isolate the place / subject
// "Dinner at Haxhi Restaurant"  →  "Haxhi Restaurant"
// "Drive from Pejë to Sarandë"  →  "Sarandë"
// ---------------------------------------------------------------------------
const ACTION_PREFIX_RE =
  /^(drive\s+from\s+.+?\s+to\s+|check-?in\s+at\s+|check\s+out\s+from\s+|dinner\s+at\s+|lunch\s+at\s+|breakfast\s+at\s+|visit\s+|explore\s+|tour\s+of\s+|hike\s+to\s+|walk\s+to\s+|travel\s+to\s+|depart\s+from\s+|arrive\s+at\s+|arrival\s+at\s+|take\s+a\s+|stop\s+at\s+|see\s+the\s+|boat\s+to\s+|swim\s+at\s+|relax\s+at\s+|overnight\s+at\s+)/i;

function toSearchQuery(title: string): string {
  return title.replace(ACTION_PREFIX_RE, "").trim() || title;
}

// Geo-anchored lookups (real Google Places photo of the exact business) get
// their own cache key, distinct from the plain text query, since the same
// query string can map to many different real-world coordinates.
function cacheKeyFor(query: string, geo?: GeoContext): string {
  return geo ? `gp:${geo.name}:${geo.lat.toFixed(4)},${geo.lon.toFixed(4)}` : query;
}

// ---------------------------------------------------------------------------
// Core fetch — one HTTP call per query, shared across all renders/components
// ---------------------------------------------------------------------------
function fetchPhoto(query: string, rawTitle?: string, geo?: GeoContext): Promise<string | null> {
  const cacheKey = cacheKeyFor(query, geo);
  if (promiseCache.has(cacheKey)) return promiseCache.get(cacheKey)!;

  const params = new URLSearchParams({ q: query });
  if (rawTitle && rawTitle !== query) params.set("raw", rawTitle);
  if (geo) {
    params.set("name", geo.name);
    params.set("lat", String(geo.lat));
    params.set("lon", String(geo.lon));
  }

  const p = fetch(`${API_BASE}/api/photos/search?${params}`)
    .then((r) => (r.ok ? (r.json() as Promise<{ url: string | null }>) : { url: null }))
    .then(({ url }) => {
      const result = url ?? null;
      photoCache.set(cacheKey, result);
      return result;
    })
    .catch(() => {
      photoCache.set(cacheKey, null);
      return null;
    });

  promiseCache.set(cacheKey, p);
  return p;
}

// ---------------------------------------------------------------------------
// Walk through a list of queries and return the first non-null URL.
// Only the first (most specific) query carries geo context — the real-place
// lookup only makes sense for the exact subject, not the generic fallbacks.
// ---------------------------------------------------------------------------
async function resolveFirstPhoto(queries: string[], rawTitle: string, geo?: GeoContext): Promise<string | null> {
  for (let i = 0; i < queries.length; i++) {
    const url = await fetchPhoto(queries[i], rawTitle, i === 0 ? geo : undefined);
    if (url !== null) return url;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Read best cached result across the full query chain
// Returns undefined if any required query hasn't been fetched yet
// ---------------------------------------------------------------------------
function fromCache(queries: string[], geo?: GeoContext): string | null | undefined {
  for (let i = 0; i < queries.length; i++) {
    const cacheKey = cacheKeyFor(queries[i], i === 0 ? geo : undefined);
    if (!photoCache.has(cacheKey)) return undefined; // not fetched yet — unknown
    const v = photoCache.get(cacheKey)!;
    if (v !== null) return v;                        // found ✓
    // this level was null → fall through to next
  }
  return null; // all levels exhausted and cached as null
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

/**
 * Resolves a landscape photo URL for an itinerary item.
 *
 *   Level 0 — real Google Places photo of the exact business (when lat/lon known)
 *   Level 1 — specific subject keyword search : "Kuršumlija River"
 *   Level 2 — city / destination               : "Ferizaj"          (optional)
 *   Level 3 — item type keyword                : "river walk"        (almost always returns)
 *
 * All queries are individually cached; the city / type photos are fetched
 * at most once even when shared across many items on the same page.
 *
 * @param title            – itinerary item title / search subject (may be an enriched query)
 * @param options.fallback – city / destination name  (e.g. "Ferizaj")
 * @param options.itemType – item_type value           (e.g. "activity")
 * @param options.enabled  – false when a static image is already available
 * @param options.lat      – real-world latitude of the place, when known
 * @param options.lon      – real-world longitude of the place, when known
 * @param options.placeName – clean real-world place name for the Google Places
 *                            lookup, when it differs from `title` (e.g. `title`
 *                            is an enriched query like "Chicken Corner restaurant
 *                            Ulcinj" but the actual business name is just
 *                            "Chicken Corner")
 */
export function useItemPhoto(
  title: string,
  options: {
    fallback?: string;
    itemType?: string;
    enabled?: boolean;
    lat?: number | null;
    lon?: number | null;
    placeName?: string;
  } = {}
): { url: string | null; loading: boolean } {
  const { fallback, itemType, enabled = true, lat, lon, placeName } = options;

  // Build the ordered query chain once.
  // Level 1 merges the place name with the destination so "Star" in "Ulcinj"
  // becomes "Star Ulcinj" — prevents generic keywords (star, bar, river…) from
  // pulling completely unrelated imagery (space, cocktail, Amazon).
  const subjectQuery = toSearchQuery(title);
  const level1 = fallback ? `${subjectQuery} ${fallback}` : subjectQuery;
  const queries = [
    level1,                                                             // "Star Ulcinj Montenegro"
    ...(fallback ? [fallback] : []),                                    // "Ulcinj Montenegro"
    TYPE_QUERY[itemType?.toLowerCase() ?? ""] ?? DEFAULT_TYPE_QUERY,   // "restaurant local cuisine"
  ];

  const geo: GeoContext | undefined =
    lat != null && lon != null ? { name: placeName ?? title, lat, lon } : undefined;

  const [url, setUrl] = useState<string | null>(() => fromCache(queries, geo) ?? null);
  const [loading, setLoading] = useState<boolean>(
    () => enabled && fromCache(queries, geo) === undefined
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Fully resolved from cache — sync state and exit without any fetch
    const cached = fromCache(queries, geo);
    if (cached !== undefined) {
      setUrl(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    resolveFirstPhoto(queries, title, geo).then((result) => {
      if (!cancelled) {
        setUrl(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level1, fallback, itemType, enabled, lat, lon, placeName]);

  return { url, loading };
}
