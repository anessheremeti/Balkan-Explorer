import { CircuitBreaker } from '../circuit-breaker.js';
import { log } from '../logger.js';

const UA = 'TravelExplorer/1.0 (open-source travel planner)';

// Two public endpoints tried in order; each has its own circuit breaker.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const breakers = ENDPOINTS.map(
  (_, i) => new CircuitBreaker(`overpass-${i}`, { threshold: 3, timeout: 120_000 })
);

// Tag → internal category mapping
const TAG_CATEGORY = {
  restaurant:      'restaurant',
  fast_food:       'restaurant',
  food_court:      'restaurant',
  cafe:            'cafe',
  bakery:          'cafe',
  coffee_shop:     'cafe',
  museum:          'museum',
  attraction:      'attraction',
  gallery:         'attraction',
  artwork:         'attraction',
  theme_park:      'attraction',
  zoo:             'attraction',
  aquarium:        'attraction',
  viewpoint:       'viewpoint',
  park:            'park',
  garden:          'park',
  nature_reserve:  'park',
  dog_park:        'park',
};

// Build an Overpass QL query using individual equality filters (no regex).
// Includes both node and way elements; ways carry a 'center' coordinate.
function buildQuery(south, west, north, east) {
  const b = `${south},${west},${north},${east}`;
  const amenities   = ['restaurant', 'fast_food', 'cafe', 'bakery', 'food_court'];
  const tourism     = ['museum', 'attraction', 'viewpoint', 'gallery', 'artwork', 'theme_park', 'zoo', 'aquarium'];
  const leisure     = ['park', 'garden', 'nature_reserve'];

  const lines = [
    '[out:json][timeout:30];',
    '(',
    ...amenities.flatMap(v => [
      `  node["amenity"="${v}"]["name"](${b});`,
      `  way["amenity"="${v}"]["name"](${b});`,
    ]),
    ...tourism.flatMap(v => [
      `  node["tourism"="${v}"]["name"](${b});`,
      `  way["tourism"="${v}"]["name"](${b});`,
    ]),
    ...leisure.flatMap(v => [
      `  node["leisure"="${v}"]["name"](${b});`,
      `  way["leisure"="${v}"]["name"](${b});`,
    ]),
    `  node["historic"]["name"](${b});`,
    `  way["historic"]["name"](${b});`,
    ');',
    'out center qt 300;',
  ];

  return lines.join('\n');
}

async function callEndpoint(endpoint, query, attempt = 0) {
  // First attempt: POST (standard); subsequent: GET (avoids body parsing issues on some servers)
  const useGet = attempt > 0;
  const url    = useGet ? `${endpoint}?data=${encodeURIComponent(query)}` : endpoint;

  const res = await fetch(url, {
    method:  useGet ? 'GET' : 'POST',
    headers: {
      'User-Agent': UA,
      'Accept':     'application/json',
      ...(useGet ? {} : { 'Content-Type': 'application/x-www-form-urlencoded' }),
    },
    ...(useGet ? {} : { body: `data=${encodeURIComponent(query)}` }),
    signal: AbortSignal.timeout(35_000),
  });

  if (res.status === 429) throw Object.assign(new Error('Rate limited (429)'), { retryable: true, status: 429 });
  if (res.status === 504) throw Object.assign(new Error('Gateway timeout (504)'), { retryable: true, status: 504 });
  if (!res.ok)            throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  return data.elements ?? [];
}

async function queryWithRetry(endpoint, breaker, query) {
  return breaker.execute(async () => {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        return await callEndpoint(endpoint, query, attempt);
      } catch (err) {
        const retryable = err.retryable || err.message.includes('timeout');
        if (!retryable || attempt === MAX_ATTEMPTS - 1) throw err;

        const delay = Math.pow(2, attempt) * 2_000 + Math.random() * 1_000;
        log.warn('Overpass retrying', { endpoint, attempt, delayMs: Math.round(delay), reason: err.message });
        await new Promise(r => setTimeout(r, delay));
      }
    }
  });
}

function parseElements(elements) {
  const buckets = {
    restaurant: [], cafe: [], museum: [], attraction: [], viewpoint: [], park: [], historic: [],
  };

  for (const el of elements) {
    const name = el.tags?.name?.trim();
    if (!name) continue;

    const { amenity, tourism, leisure, historic } = el.tags ?? {};

    let category = null;
    if (amenity)  category = TAG_CATEGORY[amenity];
    if (!category && tourism)  category = TAG_CATEGORY[tourism]  ?? 'attraction';
    if (!category && leisure)  category = TAG_CATEGORY[leisure];
    if (!category && historic) category = 'historic';

    if (!category || !buckets[category]) continue;

    // node → lat/lon directly; way → center.lat/center.lon
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!lat || !lon) continue;

    buckets[category].push({
      id:       `osm:${el.type ?? 'node'}:${el.id}`,
      name,
      lat,
      lon,
      category,
      subtype:  amenity ?? tourism ?? leisure ?? historic ?? 'place',
      cuisine:        el.tags?.cuisine        ?? null,
      website:        el.tags?.website        ?? null,
      phone:          el.tags?.phone          ?? null,
      opening_hours:  el.tags?.opening_hours  ?? null,
    });
  }

  return buckets;
}

// Public API ──────────────────────────────────────────────────────────────────

export async function fetchPlacesFromOverpass(lat, lon) {
  const R     = 0.03; // ≈ 3 km bounding box half-side
  const query = buildQuery(lat - R, lon - R, lat + R, lon + R);

  for (let i = 0; i < ENDPOINTS.length; i++) {
    const endpoint = ENDPOINTS[i];
    const breaker  = breakers[i];

    if (!breaker.isAvailable) {
      log.info('Overpass endpoint circuit-open — skipping', { index: i });
      continue;
    }

    try {
      const t0       = Date.now();
      const elements = await queryWithRetry(endpoint, breaker, query);
      const buckets  = parseElements(elements);
      const total    = Object.values(buckets).reduce((s, a) => s + a.length, 0);

      log.info('Overpass places fetched', {
        endpoint: i === 0 ? 'main' : 'kumi',
        elements:  elements.length,
        places:    total,
        latencyMs: Date.now() - t0,
      });

      return { buckets, source: 'overpass', endpoint: i === 0 ? 'main' : 'kumi' };
    } catch (err) {
      log.warn('Overpass endpoint failed', { index: i, error: err.message });
    }
  }

  throw new Error('All Overpass endpoints failed or circuit-open');
}

export function overpassHealth() {
  return ENDPOINTS.map((url, i) => ({ url, ...breakers[i].toJSON() }));
}
