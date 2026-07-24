// Provider priority: Overpass → OpenTripMap (if key set) → generic fallback
// Results are cached 24 h per city (keyed by lat/lon grid cell).
import { cityPlaceCache } from './cache.js';
import { log } from './logger.js';
import { geocodeCity } from './providers/nominatim.js';
import { fetchPlacesFromOverpass, overpassHealth } from './providers/overpass.js';
import { resolveName } from './name-utils.js';

const PLACE_TTL = 24 * 60 * 60 * 1000;

const EMPTY_BUCKETS = () => ({
  restaurant: [], cafe: [], museum: [], attraction: [], viewpoint: [], park: [], historic: [],
});

// ─── OpenTripMap (optional free provider) ────────────────────────────────────
const OTM_KEY = process.env.OPENTRIPMAP_API_KEY;

// Maps OpenTripMap kinds (comma-separated on each feature) to internal categories.
// Checked against https://dev.opentripmap.org/openapi.en.json — 'cafes' is a
// sub-kind of 'foods', 'cultural' & 'architecture' both map to attraction.
const OTM_KIND_MAP = {
  restaurants:          'restaurant',
  foods:                'restaurant',
  fast_food:            'restaurant',
  cafes:                'cafe',
  coffee_shops:         'cafe',
  museums:              'museum',
  interesting_places:   'attraction',
  tourist_facilities:   'attraction',
  cultural:             'attraction',
  architecture:         'attraction',
  religion:             'attraction',
  natural:              'park',
  gardens:              'park',
  national_parks:       'park',
  historic:             'historic',
  fortifications:       'historic',
};

async function fetchFromOpenTripMap(lat, lon) {
  if (!OTM_KEY) throw new Error('OPENTRIPMAP_API_KEY not set');

  const url = new URL('https://api.opentripmap.com/0.1/en/places/radius');
  url.searchParams.set('radius',  '5000');
  url.searchParams.set('lon',      lon.toFixed(6));
  url.searchParams.set('lat',      lat.toFixed(6));
  // Valid top-level kinds per the OpenTripMap spec
  url.searchParams.set('kinds',   'interesting_places,museums,foods,natural,historic,cultural,architecture');
  url.searchParams.set('format',  'json');
  url.searchParams.set('limit',   '100');
  url.searchParams.set('apikey',   OTM_KEY);

  const t0  = Date.now();
  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    signal:  AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`OpenTripMap HTTP ${res.status}`);

  const features = await res.json();
  const list = Array.isArray(features) ? features : features.features ?? [];

  const buckets = EMPTY_BUCKETS();
  for (const feat of list) {
    // OTM SimpleFeature: { xid, name, kinds, point:{lon,lat} }
    // OTM names come from OSM data and can be in any local script (Cyrillic etc.)
    const { name, name_local } = resolveName(feat.name, null);
    if (!name || name.length < 2 || /^\d+$/.test(name)) continue;

    const fLat = parseFloat(feat.point?.lat);
    const fLon = parseFloat(feat.point?.lon);
    if (!fLat || !fLon) continue;

    const kinds = (feat.kinds ?? '').split(',');
    let category = null;
    for (const k of kinds) {
      const mapped = OTM_KIND_MAP[k.trim()];
      if (mapped) { category = mapped; break; }
    }
    // No recognised kind — OpenTripMap's `kinds` list is broad and includes
    // many non-visitable classifications (administrative, urban_environment,
    // etc). Rather than defaulting every unmapped kind to 'attraction' (which
    // let random low-value POIs into the itinerary), skip it.
    if (!category || !buckets[category]) continue;

    buckets[category].push({
      id:         `otm:${feat.xid ?? feat.osm ?? name}`,
      name,
      name_local,
      lat:        fLat,
      lon:        fLon,
      category,
      subtype:    kinds[0]?.trim() ?? 'place',
      rating:     feat.rate ?? null,
      wikidata:   feat.wikidata ?? null,
    });
  }

  const total = Object.values(buckets).reduce((s, a) => s + a.length, 0);
  log.info('OpenTripMap places fetched', { total, latencyMs: Date.now() - t0 });
  return { buckets, source: 'opentripmap' };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getVerifiedPlaces(destination) {
  // 1. Geocode
  let coords;
  try {
    coords = await geocodeCity(destination);
  } catch (err) {
    log.warn('Geocoding failed — no real places available', { destination, error: err.message });
    return { buckets: EMPTY_BUCKETS(), source: 'fallback', coords: null };
  }

  // 2. Cache lookup (coarse grid cell to share nearby cities)
  const cacheKey = `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}`;
  const cached   = cityPlaceCache.get(cacheKey);
  if (cached) {
    const total = Object.values(cached.buckets).reduce((s, a) => s + a.length, 0);
    log.info('City place cache hit', { destination, cacheKey, total });
    return { ...cached, coords };
  }

  // 3. Race providers instead of trying them strictly in sequence. Overpass
  // usually has richer, more precise coverage, but when its public instance
  // is under load even a single endpoint can burn 20+ seconds on retries
  // before failing over — previously that meant waiting for BOTH Overpass
  // endpoints to fully exhaust their retry budget before OpenTripMap (which
  // resolved in under half a second in testing) ever got a chance. Firing
  // both at once and taking whichever succeeds first bounds worst-case
  // latency to the FASTER provider's failure, not the sum of every
  // provider's full retry budget.
  function wrapProvider(name, fn) {
    return fn().then(result => {
      const total = Object.values(result.buckets).reduce((s, a) => s + a.length, 0);
      if (total === 0) throw new Error(`${name} returned 0 places`);
      return result;
    });
  }

  const providerPromises = [
    wrapProvider('overpass', () => fetchPlacesFromOverpass(coords.lat, coords.lon)),
    ...(OTM_KEY ? [wrapProvider('opentripmap', () => fetchFromOpenTripMap(coords.lat, coords.lon))] : []),
  ];

  try {
    const result = await Promise.any(providerPromises);
    const total  = Object.values(result.buckets).reduce((s, a) => s + a.length, 0);
    log.info('Places sourced successfully', { provider: result.source, destination, total });
    cityPlaceCache.set(cacheKey, result, PLACE_TTL);
    return { ...result, coords };
  } catch (aggregateErr) {
    for (const err of aggregateErr.errors ?? []) {
      log.warn('Place provider error', { destination, error: err.message });
    }
    log.warn('All place providers failed — itinerary will use generic fallback items', { destination });
    return { buckets: EMPTY_BUCKETS(), source: 'fallback', coords };
  }
}

export function getHealthReport() {
  return {
    overpass:   overpassHealth(),
    cacheStats: { cityPlaces: cityPlaceCache.stats() },
  };
}
