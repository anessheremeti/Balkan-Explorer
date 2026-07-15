import { useEffect, useRef, useState } from "react";

/**
 * Worldwide place autocomplete backed by Photon (photon.komoot.io) —
 * an open, no-key geocoder built for search-as-you-type (Nominatim's
 * usage policy forbids autocomplete, so it is only used at submit time).
 *
 * Debounced, aborts stale requests, caches per query, typo-tolerant
 * ("presevo" → "Preševo, Serbia").
 */

export interface LocationSuggestion {
  /** Full display label, e.g. "Kotor, Montenegro" */
  label: string;
  name: string;
  country: string;
}

interface PhotonFeature {
  properties: {
    name?: string;
    country?: string;
    state?: string;
    osm_key?: string;
    osm_value?: string;
  };
}

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;
const LIMIT = 6;

// Settlement-level places only — no streets, POIs or shops
const PLACE_VALUES = new Set([
  "city", "town", "village", "hamlet", "municipality", "borough", "suburb",
]);

const cache = new Map<string, LocationSuggestion[]>();

function parseFeatures(features: PhotonFeature[]): LocationSuggestion[] {
  const seen = new Set<string>();
  const out: LocationSuggestion[] = [];
  for (const f of features) {
    const { name, country, osm_key, osm_value } = f.properties;
    if (!name || !country) continue;
    if (osm_key !== "place" || !PLACE_VALUES.has(osm_value ?? "")) continue;
    const label = `${name}, ${country}`;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ label, name, country });
  }
  return out;
}

export function useLocationSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim().toLowerCase();

    abortRef.current?.abort();

    if (q.length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const cached = cache.get(q);
    if (cached) {
      setSuggestions(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=${LIMIT}&lang=en`,
          { signal: ctrl.signal }
        );
        if (!res.ok) throw new Error("suggest failed");
        const data: { features?: PhotonFeature[] } = await res.json();
        const parsed = parseFeatures(data.features ?? []);
        cache.set(q, parsed);
        setSuggestions(parsed);
        setLoading(false);
      } catch (err) {
        // Aborted = a newer query took over; anything else fails silently —
        // the field still works as free text input.
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setSuggestions([]);
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  return { suggestions, loading };
}
