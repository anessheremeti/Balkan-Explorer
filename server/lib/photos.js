import { photoCache } from './cache.js';
import { findPlacePhoto } from './providers/google-places.js';
import { fetchWikidataImage } from './providers/wikidata.js';
import { mapWithConcurrency } from './concurrency.js';
import { log } from './logger.js';

// Returns whatever thumbnail URL Wikipedia's own API gives back, unmodified.
// This used to force-rewrite the width to "/800px-" for a larger image, but
// Wikimedia's thumbnail server only serves a fixed whitelist of sizes for
// some large/composite source images (rejects anything else with a 400) —
// confirmed breaking on a real city collage photo. The API's own thumbnail
// URL is always a valid, already-generated size, so trust it as-is.
async function searchWikipedia(query) {
  const UA = 'TravelExplorer/1.0 (travel planning app)';
  try {
    const direct = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': UA } }
    );
    if (direct.ok) {
      const page = await direct.json();
      if (page.thumbnail?.source) return page.thumbnail.source;
    }
    const search = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`,
      { headers: { 'User-Agent': UA } }
    );
    if (!search.ok) return null;
    const title = (await search.json()).query?.search?.[0]?.title;
    if (!title) return null;
    const page = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { 'User-Agent': UA } }
    );
    if (!page.ok) return null;
    const pd = await page.json();
    return pd.thumbnail?.source ?? null;
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Photo resolution for a SINGLE real, verified place — always called with the
// place's own identity (name + coordinates), never a label shared across many
// places. That guarantee is what keeps different real places from ever
// landing on the same cached photo; it must hold for every caller.
//
// Priority — both tiers are geographically anchored (no plain-keyword step):
//   1. Wikidata P18 image  — exact entity match via QID. Zero ambiguity,
//      free, unlimited. Used when the source OSM/OpenTripMap data linked one.
//   2. Google Places photo — accurate for businesses (restaurants, cafés) by
//      name + coordinates, confidence-checked against the returned name.
//   3. null — no photo for this specific place. resolvePhotosForDays() below
//      falls back to a real, verified photo of the place's CITY rather than
//      guessing with a keyword search (generic names like "City Park" or
//      "War memorial" repeat across many towns, and a text-only search has
//      no way to tell them apart — confirmed pulling a completely different
//      city's park photo for one of these in testing).
//
// Results are cached per-place (by wikidata QID when available, otherwise by
// name+coordinates) so a place already resolved for one trip is instant for
// every later trip that includes it, without a second round of API calls.
// ─────────────────────────────────────────────────────────────────────────────
export async function resolvePlacePhoto({ name, lat, lon, wikidata }) {
  if (!name || lat == null || lon == null) return null;

  if (wikidata) {
    const wdCacheKey = `wd:${wikidata}`;
    const wdCached = photoCache.get(wdCacheKey);
    if (wdCached) return wdCached;

    const wdPhoto = await fetchWikidataImage(wikidata);
    if (wdPhoto) {
      photoCache.set(wdCacheKey, wdPhoto, 30 * 24 * 60 * 60 * 1000); // 30 d — Commons images rarely change
      return wdPhoto;
    }
  }

  const cacheKey = `place:${name}:${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = photoCache.get(cacheKey);
  if (cached) return cached;

  const realPhoto = await findPlacePhoto(name, lat, lon);
  if (realPhoto) {
    photoCache.set(cacheKey, realPhoto, 7 * 24 * 60 * 60 * 1000); // 7 d — real photos don't change often
    return realPhoto;
  }

  // No keyword-search fallback here on purpose. Generic OSM place names —
  // "Parku i Qytetit" (City Park), "War memorial" — exist verbatim in nearly
  // every town, and a text-only keyword search (Pexels/Pixabay/Openverse/
  // Wikipedia) has no way to verify it found a photo of THIS town's park and
  // not some other town's identically-named one (confirmed in testing: a
  // Gjilan park pulled a real photo of Ferizaj's park by that mechanism).
  // Wikidata and Google Places above are both geographically anchored (exact
  // entity ID, or name+coordinates with a confidence check) — this is the
  // only tier that wasn't, so it's the one dropped. Returning null here lets
  // resolvePhotosForDays' city-photo fallback take over instead, which is a
  // real, verified photo of the correct city rather than a guess.
  return null;
}

const CONCURRENCY = 4;

// A city almost always has a Wikipedia page with a real photo — far more
// reliable than hoping a small business/attraction resolves. Used as the
// fallback for any card that still has no photo of its own (a real place we
// couldn't confidently identify, or a generic filler slot), rather than
// leaving a bare category icon. Cached long-term per destination since the
// same city recurs across many trips and never needs re-resolving.
async function resolveCityPhoto(destination) {
  const cacheKey = `city:${destination}`;
  const cached = photoCache.get(cacheKey);
  if (cached) return cached;

  // Wikipedia article titles are just the city name ("Tirana"), not
  // "Tirana, Albania" — try the bare name first, then the full label as a
  // fallback for the rare page that needs the extra context to resolve.
  const cityName = destination.split(',')[0].trim();
  const url = (await searchWikipedia(cityName)) ?? (await searchWikipedia(destination));

  if (url) photoCache.set(cacheKey, url, 30 * 24 * 60 * 60 * 1000); // 30 d
  return url;
}

// Resolves and attaches a photo to every itinerary item, once, right after
// the itinerary is assembled — not lazily per page view. Mutates each item
// in place (`_image_url`), so the caller's already-cached payload object
// picks up the result automatically (same object reference).
//
// Two passes:
//   1. Real places (have coordinates) get their own specific photo via the
//      Wikidata → Google Places cascade (see resolvePlacePhoto).
//   2. Anything still without a photo — a real place that cascade couldn't
//      confidently resolve, or a generic filler slot with no coordinates at
//      all — falls back to a representative photo of its city, rather than
//      a bare icon or a mismatched keyword-search guess.
export async function resolvePhotosForDays(days, fallbackDestination) {
  const jobs = [];
  const destinations = new Set();
  for (const day of days) {
    destinations.add(day.city ?? fallbackDestination);
    for (const item of day.itinerary_items) {
      if (item._lat != null && item._lon != null) jobs.push({ item });
    }
  }

  if (jobs.length) {
    await mapWithConcurrency(jobs, CONCURRENCY, async ({ item }) => {
      try {
        item._image_url = await resolvePlacePhoto({
          name: item.title,
          lat: item._lat,
          lon: item._lon,
          wikidata: item._wikidata,
        });
      } catch (err) {
        log.warn('Photo resolution failed for item', { title: item.title, error: err.message });
        item._image_url = null;
      }
    });
  }
  const resolvedDirect = jobs.filter(j => j.item._image_url).length;

  const cityPhotos = new Map();
  await mapWithConcurrency([...destinations], 3, async (destination) => {
    try {
      cityPhotos.set(destination, await resolveCityPhoto(destination));
    } catch (err) {
      log.warn('City photo resolution failed', { destination, error: err.message });
      cityPhotos.set(destination, null);
    }
  });

  let cityFallbacks = 0;
  for (const day of days) {
    const cityPhoto = cityPhotos.get(day.city ?? fallbackDestination);
    if (!cityPhoto) continue;
    for (const item of day.itinerary_items) {
      if (!item._image_url) {
        item._image_url = cityPhoto;
        cityFallbacks++;
      }
    }
  }

  log.info('Photo resolution complete', {
    realPlaces: jobs.length,
    resolvedDirect,
    cityFallbacks,
  });
}
