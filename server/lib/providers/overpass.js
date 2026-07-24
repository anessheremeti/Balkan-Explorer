import { CircuitBreaker } from '../circuit-breaker.js';
import { log } from '../logger.js';
import { resolveName } from '../name-utils.js';

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

// `historic=*` is tagged on a huge range of OSM features, from genuine
// visit-worthy sites (fortresses, ruins, monasteries) down to a single
// milestone or boundary stone on the side of a road. Unlike the other tag
// families above (whose query already only requests specific values), the
// historic query fetches every value with a name — so we filter it down to
// an allowlist of types someone would actually plan a visit around.
const HISTORIC_ALLOW = new Set([
  'castle', 'fort', 'fortress', 'citywalls', 'city_gate', 'archaeological_site',
  'ruins', 'monastery', 'church', 'monument', 'memorial', 'tower',
  'manor', 'palace', 'tomb', 'wayside_shrine', 'building',
]);

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
    // A healthy response for our bounding box comes back in 2-10s (observed).
    // 35s let one bad attempt burn a huge chunk of the whole request just
    // waiting on a server that's already overloaded — 12s fails fast enough
    // to let the retry/next-endpoint/OpenTripMap fallback actually kick in
    // within a reasonable total time.
    signal: AbortSignal.timeout(12_000),
  });

  if (res.status === 429) throw Object.assign(new Error('Rate limited (429)'), { retryable: true, status: 429 });
  if (res.status === 504) throw Object.assign(new Error('Gateway timeout (504)'), { retryable: true, status: 504 });
  if (!res.ok)            throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  return data.elements ?? [];
}

async function queryWithRetry(endpoint, breaker, query) {
  return breaker.execute(async () => {
    // 2 attempts, not 3 — combined with the 12s per-attempt timeout below,
    // this bounds a single endpoint's worst case to ~25s instead of the
    // ~110s it could previously reach (3 × 35s + backoff), which was the
    // dominant cause of multi-minute itinerary generation when Overpass was
    // under load (observed 149s for one city before this fix).
    const MAX_ATTEMPTS = 2;
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
    const tags = el.tags ?? {};

    // Elements whose primary purpose is a road/junction (roundabouts, milestones,
    // marked crossings…) sometimes also carry a secondary `historic` tag because
    // a monument sits at that spot — but the element itself is the road feature,
    // not a standalone visitable site. Drop these before they reach an itinerary.
    if (tags.highway) continue;

    // Name resolution priority (most → least English-friendly):
    // 1. name:en       — explicit English tag
    // 2. int_name      — international/Latin name (OSM convention)
    // 3. name:sr-Latn  — Serbian written in Latin script
    // 4. transliterate — auto-convert Cyrillic → Latin when no Latin tag exists
    // 5. name          — raw local name as final fallback (e.g. Albanian, already Latin)
    const latinTag = tags['name:en']?.trim()
                  ?? tags['int_name']?.trim()
                  ?? tags['name:sr-Latn']?.trim()
                  ?? null;
    const { name, name_local: name_local_display } = resolveName(tags['name'], latinTag);

    if (!name || name.length < 2 || /^\d+$/.test(name)) continue;

    // Some regions have community-mapped roads/junctions/roundabouts tagged
    // tourism=attraction or tourism=artwork instead of the (correct) highway
    // tag — the `tags.highway` guard above can't catch these since the road
    // tag itself is missing. Filter by name instead: local mappers in the
    // Balkans commonly name these "Rruga/Ruga <person>" (Street of X) or
    // "Rrethi <place>" (Roundabout at X) — never a real point of interest.
    if (/^(rruga|ruga|rrethi|autostrada|bulevardi)\b/i.test(name)) continue;

    const { amenity, tourism, leisure, historic } = el.tags ?? {};

    let category = null;
    if (amenity)  category = TAG_CATEGORY[amenity];
    if (!category && tourism)  category = TAG_CATEGORY[tourism]  ?? 'attraction';
    if (!category && leisure)  category = TAG_CATEGORY[leisure];
    if (!category && historic && HISTORIC_ALLOW.has(historic)) category = 'historic';

    if (!category || !buckets[category]) continue;

    // node → lat/lon directly; way → center.lat/center.lon
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!lat || !lon) continue;

    buckets[category].push({
      id:         `osm:${el.type ?? 'node'}:${el.id}`,
      name,
      name_local: name_local_display,
      lat,
      lon,
      category,
      subtype:   amenity ?? tourism ?? leisure ?? historic ?? 'place',
      cuisine:        tags.cuisine        ?? null,
      website:        tags.website        ?? null,
      phone:          tags.phone          ?? null,
      opening_hours:  tags.opening_hours  ?? null,
      // Cross-reference to the Wikidata entity, when the OSM mapper linked one.
      // Lets the photo pipeline fetch the exact, unambiguous image (P18 claim)
      // for this specific place instead of a fuzzy name/keyword match.
      wikidata:       tags.wikidata       ?? null,
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
