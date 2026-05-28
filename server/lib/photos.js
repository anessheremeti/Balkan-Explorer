import { photoCache } from './cache.js';

const STOP_WORDS = new Set([
  'visit', 'tour', 'walk', 'stroll', 'explore', 'discover', 'enjoy',
  'experience', 'see', 'attend', 'take', 'join', 'find', 'catch',
  'traditional', 'iconic', 'scenic', 'local', 'morning', 'evening',
  'night', 'day', 'at', 'in', 'the', 'a', 'an', 'and', 'or', 'of', 'with', 'for', '&',
]);

export function normaliseQuery(raw) {
  return (raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 3)
    .join(' ');
}

async function searchPexels(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: key } }
    );
    if (!r.ok) return null;
    const { photos = [] } = await r.json();
    if (!photos.length) return null;
    const pick = photos[Math.floor(Math.random() * Math.min(3, photos.length))];
    return pick.src.large ?? pick.src.medium;
  } catch { return null; }
}

async function searchPixabay(query) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=5&safesearch=true`
    );
    if (!r.ok) return null;
    const { hits = [] } = await r.json();
    if (!hits.length) return null;
    const pick = hits[Math.floor(Math.random() * Math.min(3, hits.length))];
    return pick.largeImageURL ?? pick.webformatURL;
  } catch { return null; }
}

async function searchOpenverse(query) {
  try {
    const r = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=10&license_type=commercial&aspect_ratio=wide`,
      { headers: { 'User-Agent': 'TravelExplorer/1.0' } }
    );
    if (!r.ok) return null;
    const { results = [] } = await r.json();
    const valid = results.filter(x => x.url);
    if (!valid.length) return null;
    return valid[Math.floor(Math.random() * Math.min(4, valid.length))].url;
  } catch { return null; }
}

async function searchWikipedia(query) {
  const UA = 'TravelExplorer/1.0 (travel planning app)';
  try {
    const direct = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': UA } }
    );
    if (direct.ok) {
      const page = await direct.json();
      if (page.thumbnail?.source) return page.thumbnail.source.replace(/\/\d+px-/, '/800px-');
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
    return pd.thumbnail?.source?.replace(/\/\d+px-/, '/800px-') ?? null;
  } catch { return null; }
}

const CATEGORY_SEEDS = {
  food: 'food-plate-meal', restaurant: 'restaurant-dining', breakfast: 'breakfast-morning-cafe',
  lunch: 'street-food-lunch', dinner: 'dinner-candle-table', seafood: 'seafood-harbor-fresh',
  market: 'market-bazaar-vendors', museum: 'museum-art-gallery', castle: 'castle-fortress-stone',
  mosque: 'mosque-dome-minaret', church: 'church-cathedral-bell', nature: 'forest-nature-green',
  park: 'park-garden-path', beach: 'beach-ocean-waves', waterfront: 'harbour-water-boats',
  hike: 'mountain-trail-hike', mountain: 'mountain-peak-snow', valley: 'valley-landscape-hills',
  lake: 'lake-reflection-calm', river: 'river-canyon-water', sunset: 'sunset-golden-horizon',
  city: 'city-skyline-urban', street: 'street-alley-cobblestone', bazaar: 'bazaar-spices-colorful',
  gallery: 'art-gallery-exhibit', library: 'library-books-reading', rooftop: 'rooftop-terrace-view',
  harbour: 'harbour-sailboats-dock', hotel: 'hotel-lobby-luxury', garden: 'garden-flowers-fountain',
  bridge: 'bridge-architecture-river', monument: 'monument-landmark-stone', palace: 'palace-grand-architecture',
  default: 'travel-landscape-panorama',
};

function categoryFallback(query) {
  const q = (query ?? '').toLowerCase();
  let bestKey = 'default', bestLen = 0;
  for (const kw of Object.keys(CATEGORY_SEEDS)) {
    if (kw !== 'default' && q.includes(kw) && kw.length > bestLen) { bestKey = kw; bestLen = kw.length; }
  }
  return `https://picsum.photos/seed/${CATEGORY_SEEDS[bestKey]}/800/500`;
}

function race(p) {
  return p.then(url => { if (!url) throw new Error('no result'); return url; });
}

export async function searchPhotos(query, raw) {
  const normalised = normaliseQuery(query);
  const cacheKey   = normalised || query;

  const cached = photoCache.get(cacheKey);
  if (cached) return cached;

  const sources = [
    race(searchPexels(normalised)),
    race(searchPixabay(normalised)),
    race(searchOpenverse(normalised)),
    race(searchWikipedia(normalised)),
    ...(raw && raw !== query ? [race(searchOpenverse(raw)), race(searchWikipedia(raw))] : []),
  ];

  const fallback = categoryFallback(normalised || query);
  const url = await Promise.race([
    Promise.any(sources).catch(() => fallback),
    new Promise(resolve => setTimeout(() => resolve(fallback), 4_000)),
  ]);

  photoCache.set(cacheKey, url, 60 * 60 * 1000); // 1 h
  return url;
}
