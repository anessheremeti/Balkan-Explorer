import { log } from '../logger.js';

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;

function normalise(s) {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Google's "Find Place From Text" never reports "no match" — when the searched
// business isn't in its index near the given coordinate, it silently returns
// the closest/most relevant nearby place instead, even if the name is
// completely unrelated (e.g. searching "Peja Grill" can return "Fisi
// Restaurant" two doors down). Without validating the name, that wrong photo
// gets presented as if it were the real one. Require the candidate name to
// share at least one meaningful word with what we searched for.
function isConfidentMatch(searched, found) {
  const a = normalise(searched);
  const b = normalise(found);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const wordsA = a.split(' ').filter(w => w.length > 2);
  const wordsB = new Set(b.split(' ').filter(w => w.length > 2));
  return wordsA.some(w => wordsB.has(w));
}

// Finds the real-world Google Places photo for a specific named place near a
// given coordinate. This is far more accurate than keyword stock-photo search
// for proper-noun businesses (e.g. "Chicken Corner") that generic photo APIs
// have no concept of — they just keyword-match "chicken" and "corner".
export async function findPlacePhoto(name, lat, lon) {
  if (!GOOGLE_KEY || !name || lat == null || lon == null) return null;

  try {
    const findUrl = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
    findUrl.searchParams.set('input', name);
    findUrl.searchParams.set('inputtype', 'textquery');
    findUrl.searchParams.set('fields', 'place_id,name,photos');
    findUrl.searchParams.set('locationbias', `circle:400@${lat},${lon}`);
    findUrl.searchParams.set('key', GOOGLE_KEY);

    const res = await fetch(findUrl.toString(), { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 'OK') return null;

    const candidate = data.candidates?.[0];
    if (!candidate) return null;

    if (!isConfidentMatch(name, candidate.name)) {
      log.info('Google Places: low-confidence match — skipping', { searched: name, found: candidate.name });
      return null;
    }

    const photoRef = candidate.photos?.[0]?.photo_reference;
    if (!photoRef) return null;

    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_KEY}`;
  } catch (err) {
    log.warn('Google Places photo lookup failed', { name, error: err.message });
    return null;
  }
}

export function googlePlacesEnabled() {
  return !!GOOGLE_KEY;
}
