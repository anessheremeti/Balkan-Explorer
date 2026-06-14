import { useState, useEffect } from "react";

// ---------------------------------------------------------------------------
// Module-level cache
// photoCache   : final result per query  (null = confirmed no result)
// promiseCache : shared promise per query — prevents duplicate fetches and is
//                safe under React StrictMode double-effect invocation
// ---------------------------------------------------------------------------
const photoCache = new Map<string, string | null>();
const promiseCache = new Map<string, Promise<string | null>>();

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

// ---------------------------------------------------------------------------
// Core fetch — one HTTP call per query, shared across all renders/components
// ---------------------------------------------------------------------------
function fetchPhoto(query: string, rawTitle?: string): Promise<string | null> {
  if (promiseCache.has(query)) return promiseCache.get(query)!;

  const params = new URLSearchParams({ q: query });
  if (rawTitle && rawTitle !== query) params.set("raw", rawTitle);

  const p = fetch(`/api/photos/search?${params}`)
    .then((r) => (r.ok ? (r.json() as Promise<{ url: string | null }>) : { url: null }))
    .then(({ url }) => {
      const result = url ?? null;
      photoCache.set(query, result);
      return result;
    })
    .catch(() => {
      photoCache.set(query, null);
      return null;
    });

  promiseCache.set(query, p);
  return p;
}

// ---------------------------------------------------------------------------
// Walk through a list of queries and return the first non-null URL
// ---------------------------------------------------------------------------
// queries[0] is the normalised activity subject; rawTitle is the original
// card title passed as ?raw= so Wikipedia can search with the full phrase
async function resolveFirstPhoto(queries: string[], rawTitle: string): Promise<string | null> {
  for (const q of queries) {
    const url = await fetchPhoto(q, rawTitle);
    if (url !== null) return url;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Read best cached result across the full query chain
// Returns undefined if any required query hasn't been fetched yet
// ---------------------------------------------------------------------------
function fromCache(queries: string[]): string | null | undefined {
  for (const q of queries) {
    if (!photoCache.has(q)) return undefined; // not fetched yet — unknown
    const v = photoCache.get(q)!;
    if (v !== null) return v;                 // found ✓
    // this level was null → fall through to next
  }
  return null; // all levels exhausted and cached as null
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

/**
 * Resolves a landscape photo URL for an itinerary item using a 3-level
 * waterfall so every card gets a photo regardless of destination obscurity:
 *
 *   Level 1 — specific subject  : "Kuršumlija River"
 *   Level 2 — city / destination: "Ferizaj"          (optional)
 *   Level 3 — item type keyword : "river walk"        (almost always returns)
 *
 * All queries are individually cached; the city / type photos are fetched
 * at most once even when shared across many items on the same page.
 *
 * @param title            – itinerary item title
 * @param options.fallback – city / destination name  (e.g. "Ferizaj")
 * @param options.itemType – item_type value           (e.g. "activity")
 * @param options.enabled  – false when a static image is already available
 */
export function useItemPhoto(
  title: string,
  options: { fallback?: string; itemType?: string; enabled?: boolean } = {}
): { url: string | null; loading: boolean } {
  const { fallback, itemType, enabled = true } = options;

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

  const [url, setUrl] = useState<string | null>(() => fromCache(queries) ?? null);
  const [loading, setLoading] = useState<boolean>(
    () => enabled && fromCache(queries) === undefined
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Fully resolved from cache — sync state and exit without any fetch
    const cached = fromCache(queries);
    if (cached !== undefined) {
      setUrl(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    resolveFirstPhoto(queries, title).then((result) => {
      if (!cancelled) {
        setUrl(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level1, fallback, itemType, enabled]);

  return { url, loading };
}
