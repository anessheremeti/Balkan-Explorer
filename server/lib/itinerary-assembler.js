import crypto from 'crypto';
import { log } from './logger.js';

// Six fixed time-slots per day, each mapped to preferred place categories in priority order.
const DAILY_SLOTS = ['08:00', '10:30', '13:00', '15:30', '18:00', '20:00'];

const SLOT_CATEGORIES = {
  '08:00': ['cafe', 'restaurant'],
  '10:30': ['museum', 'historic', 'attraction'],
  '13:00': ['restaurant', 'cafe'],
  '15:30': ['park', 'viewpoint', 'attraction', 'historic'],
  '18:00': ['viewpoint', 'park', 'attraction'],
  '20:00': ['restaurant', 'cafe'],
};

const PLACE_META = {
  restaurant: { type: 'food',     desc: p => `Enjoy a meal at ${p.name}${p.cuisine ? ` — known for its ${p.cuisine} cuisine` : ''}.` },
  cafe:       { type: 'food',     desc: p => `Grab coffee and a bite at ${p.name}, a popular local spot.` },
  museum:     { type: 'activity', desc: p => `Explore ${p.name} and discover the history and culture of the region.` },
  attraction: { type: 'activity', desc: p => `Visit ${p.name}, a notable landmark in the area.` },
  viewpoint:  { type: 'activity', desc: p => `Head to ${p.name} for panoramic views of the city.` },
  park:       { type: 'activity', desc: p => `Enjoy a walk through ${p.name}.` },
  historic:   { type: 'activity', desc: p => `Discover ${p.name}, a site with deep local significance.` },
};

// Category label used to enrich the photo search query so generic names like
// "Star" or "Park" don't pull unrelated imagery from photo APIs.
const CATEGORY_PHOTO_LABEL = {
  restaurant: 'restaurant',
  cafe:       'cafe coffee',
  museum:     'museum',
  attraction: 'landmark',
  viewpoint:  'panoramic view',
  park:       'park garden',
  historic:   'historic site',
};

const FALLBACK_SLOTS = {
  '08:00': d => ({ item_type: 'food',     title: 'Morning Café',          description: `Start with coffee and breakfast at a local café in ${d}.` }),
  '10:30': d => ({ item_type: 'activity', title: 'Cultural Exploration',   description: `Explore the historic and cultural sites of ${d}.` }),
  '13:00': d => ({ item_type: 'food',     title: 'Local Lunch',           description: `Try traditional cuisine at a restaurant in ${d}.` }),
  '15:30': d => ({ item_type: 'activity', title: 'Afternoon Sightseeing',  description: `Visit the main sights and attractions of ${d}.` }),
  '18:00': d => ({ item_type: 'activity', title: 'Evening Walk',           description: `Enjoy an evening stroll through ${d}.` }),
  '20:00': d => ({ item_type: 'food',     title: 'Dinner',                description: `End the day with a relaxed dinner in ${d}.` }),
};

function mapTime(t) {
  if (!t) return '09:00:00';
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) {
    const [h, m] = t.split(':');
    return `${h.padStart(2, '0')}:${m}:00`;
  }
  return { morning: '08:00:00', afternoon: '14:00:00', evening: '18:00:00', night: '20:00:00' }[t] ?? '09:00:00';
}

// Seeded Fisher-Yates shuffle — deterministic per (tripId, category).
// Same trip always gets the same unique ordering (reproducible), but different trips differ.
function seededShuffle(arr, seed32) {
  const a = [...arr];
  let s   = seed32 >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    // xorshift32
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tripSeed(tripId) {
  return parseInt((tripId ?? '00000000').replace(/-/g, '').slice(0, 8), 16);
}

function buildItem(place, time, dayId, destination) {
  const meta     = PLACE_META[place.category] ?? { type: 'activity', desc: p => `Visit ${p.name}.` };
  const catLabel = CATEGORY_PHOTO_LABEL[place.category] ?? '';
  // Category + destination only — deliberately omits the business's proper
  // name. Stock photo APIs (Pexels/Pixabay/Wikipedia) do literal keyword
  // matching with no concept of real-world businesses, so a name like "Peja
  // Grill" can pull back a totally unrelated photo (a coastal cliff, once
  // seen in testing) just because some word in the phrase loosely matched.
  // The actual business photo is fetched separately via Google Places using
  // place.name + coordinates, which DOES understand real-world names. This
  // query is only the safe, generic fallback for when that lookup fails.
  const photoQuery = destination
    ? `${catLabel || place.category} ${destination}`.replace(/\s+/g, ' ').trim()
    : null;
  return {
    id:               crypto.randomUUID(),
    itinerary_day_id: dayId,
    item_type:        meta.type,
    title:            place.name,
    description:      meta.desc(place),
    start_time:       mapTime(time),
    // prefixed fields — stripped before DB insert, stored in metadata jsonb
    _source:      place.id.startsWith('otm:') ? 'opentripmap' : 'openstreetmap',
    _place_id:    place.id,
    _lat:         place.lat,
    _lon:         place.lon,
    _photo_query: photoQuery,
  };
}

function buildFallback(destination, time, dayId) {
  const base = (FALLBACK_SLOTS[time] ?? FALLBACK_SLOTS['10:30'])(destination);
  return { id: crypto.randomUUID(), itinerary_day_id: dayId, start_time: mapTime(time), _source: 'fallback', ...base };
}

export function assembleItinerary(tripId, tripData, themes, buckets) {
  const { destination, starting_date, returning_date } = tripData;
  const duration = Math.max(
    1,
    Math.ceil((new Date(returning_date) - new Date(starting_date)) / 86_400_000)
  );

  // Shuffle each category's pool using the trip ID as seed so every trip is unique.
  const seed     = tripSeed(tripId);
  const shuffled = {};
  for (const [cat, places] of Object.entries(buckets)) {
    shuffled[cat] = seededShuffle(places, seed + cat.charCodeAt(0));
  }

  // Cursor-based cycling: walks through the pool and wraps around when exhausted.
  // Prevents any two consecutive days from showing the same place at the top of the list.
  const cursors = {};
  function pickPlace(cats) {
    for (const cat of cats) {
      const pool = shuffled[cat];
      if (!pool?.length) continue;
      cursors[cat]   = cursors[cat] ?? 0;
      const item     = pool[cursors[cat] % pool.length];
      cursors[cat]++;
      return item;
    }
    return null;
  }

  const startDate = new Date(starting_date);
  const days      = [];

  for (let i = 0; i < duration; i++) {
    const dayId = crypto.randomUUID();
    const date  = new Date(startDate);
    date.setDate(date.getDate() + i);

    const itinerary_items = DAILY_SLOTS.map(time => {
      const place = pickPlace(SLOT_CATEGORIES[time] ?? ['attraction']);
      return place ? buildItem(place, time, dayId, destination) : buildFallback(destination, time, dayId);
    });

    days.push({
      id:              dayId,
      trip_id:         tripId,
      day_number:      i + 1,
      title:           themes[i] ?? `Day ${i + 1} — ${destination}`,
      date:            date.toISOString().split('T')[0],
      itinerary_items,
    });
  }

  const allItems   = days.flatMap(d => d.itinerary_items);
  const realCount  = allItems.filter(x => x._source !== 'fallback').length;
  log.info('Itinerary assembled', {
    tripId,
    duration,
    totalItems: allItems.length,
    realPlaces: realCount,
    fallback:   allItems.length - realCount,
  });

  return {
    trip: {
      id:    tripId,
      ...tripData,
      title: tripData.title ?? `${tripData.starting_location} → ${tripData.destination}`,
    },
    days,
  };
}
