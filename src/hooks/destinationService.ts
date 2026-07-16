import i18n from "../i18n/index.js";

export interface Highlight {
  name: string;
  description?: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  description: string;
  location: string;
  hero_image: string;
  images?: string[];
  highlights?: Highlight[];
  rating?: number;
  places_count?: number;
  best_time_to_visit?: string;
  language?: string;
  currency?: string;
  avg_budget?: string;
  timezone?: string;
  created_at?: string;
}

// Internal type: stores i18n keys instead of hardcoded strings.
// Proper nouns (name, country, language, currency, timezone) are not translated.
interface DestinationKeys {
  id: string;
  name: string;
  country: string;
  descKey: string;
  locationKey: string;
  hero_image: string;
  images?: string[];
  highlightKeys?: Array<{ nameKey: string; descKey: string }>;
  rating?: number;
  places_count?: number;
  bestTimeKey: string;
  language?: string;
  currency?: string;
  avg_budget?: string;
  timezone?: string;
}

// Translates a DestinationKeys record into a fully-resolved Destination
// using the active i18n language. Cache keys include the language so
// switching language always returns fresh translated data.
function translateDestination(d: DestinationKeys): Destination {
  const ns = "destinations";
  return {
    id: d.id,
    name: d.name,
    country: d.country,
    description: i18n.t(d.descKey, { ns }),
    location: i18n.t(d.locationKey, { ns }),
    hero_image: d.hero_image,
    images: d.images,
    highlights: d.highlightKeys?.map((h) => ({
      name: i18n.t(h.nameKey, { ns }),
      description: i18n.t(h.descKey, { ns }),
    })),
    rating: d.rating,
    places_count: d.places_count,
    best_time_to_visit: i18n.t(d.bestTimeKey, { ns }),
    language: d.language,
    currency: d.currency,
    avg_budget: d.avg_budget,
    timezone: d.timezone,
  };
}

const createImageUrl = (unsplashQuery: string, width: number, height: number): string => {
  const params = new URLSearchParams({
    w: width.toString(),
    h: height.toString(),
    fit: "crop",
    q: "80",
    auto: "format",
  });
  return `https://images.unsplash.com/photo-${unsplashQuery}?${params.toString()}`;
};

// Cache keyed by `${id}_${language}` so language switches bypass stale entries.
const destinationCache = new Map<string, Destination>();
const cacheTimestamps = new Map<string, number>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

const mockDestinations: Record<string, DestinationKeys> = {
  "1": {
    id: "1",
    name: "Sarandë",
    country: "Albania",
    descKey: "sarande_description",
    locationKey: "sarande_location",
    bestTimeKey: "sarande_best_time",
    hero_image: createImageUrl("1507003211169-0a1dd7228f2d", 1200, 600),
    images: [
      "https://i.pinimg.com/1200x/cb/70/00/cb7000acab9fa010951fe1ac7796fb96.jpg",
      "https://i.pinimg.com/736x/11/0a/6b/110a6b880a27f1920b8ae8ba6ffd90f6.jpg",
      "https://i.pinimg.com/736x/d9/4b/70/d94b70e91c45c4e53a284ece46b86f7b.jpg",
      "https://i.pinimg.com/736x/d9/4b/70/d94b70e91c45c4e53a284ece46b86f7b.jpg",
    ],
    highlightKeys: [
      { nameKey: "sarande_h1_name", descKey: "sarande_h1_desc" },
      { nameKey: "sarande_h2_name", descKey: "sarande_h2_desc" },
      { nameKey: "sarande_h3_name", descKey: "sarande_h3_desc" },
      { nameKey: "sarande_h4_name", descKey: "sarande_h4_desc" },
    ],
    rating: 4.8,
    places_count: 42,
    avg_budget: "$40-60 per day",
    language: "Albanian",
    currency: "Albanian Lek (ALL)",
    timezone: "UTC+1 (EET)",
  },
  "2": {
    id: "2",
    name: "Kotor",
    country: "Montenegro",
    descKey: "kotor_description",
    locationKey: "kotor_location",
    bestTimeKey: "kotor_best_time",
    hero_image: "https://images.unsplash.com/photo-1581234720562-40cb08b2d57d?w=1200&h=600&fit=crop&q=80&auto=format",
    images: [
      "https://i.pinimg.com/736x/b3/29/93/b329934b5e23efedf982109687d64a3f.jpg",
      "https://i.pinimg.com/1200x/19/8d/22/198d22f6d8c5226ada173984436ada9f.jpg",
      "https://i.pinimg.com/1200x/bc/c0/8a/bcc08a0ae3d4d2651574a914e4599e1a.jpg",
      "https://i.pinimg.com/1200x/55/27/b6/5527b6e0dd7bd499bd380f5e7224ae35.jpg",
    ],
    highlightKeys: [
      { nameKey: "kotor_h1_name", descKey: "kotor_h1_desc" },
      { nameKey: "kotor_h2_name", descKey: "kotor_h2_desc" },
      { nameKey: "kotor_h3_name", descKey: "kotor_h3_desc" },
      { nameKey: "kotor_h4_name", descKey: "kotor_h4_desc" },
    ],
    rating: 4.9,
    places_count: 35,
    avg_budget: "$50-75 per day",
    language: "Montenegrin",
    currency: "Euro (EUR)",
    timezone: "UTC+1 (CET)",
  },
  "3": {
    id: "3",
    name: "Ohrid",
    country: "North Macedonia",
    descKey: "ohrid_description",
    locationKey: "ohrid_location",
    bestTimeKey: "ohrid_best_time",
    hero_image: createImageUrl("1470114716159-e389f8014d41", 1200, 600),
    images: [
      "https://i.pinimg.com/1200x/b6/40/01/b640013b802b0b0b7319fed474472a30.jpg",
      "https://i.pinimg.com/1200x/3f/2e/bb/3f2ebb454109e5d550a83b26a7eebc0d.jpg",
      "https://i.pinimg.com/1200x/bc/c0/8a/bcc08a0ae3d4d2651574a914e4599e1a.jpg",
      "https://i.pinimg.com/736x/be/33/ba/be33ba2f1254f949f3a97617ba7acc65.jpg",
    ],
    highlightKeys: [
      { nameKey: "ohrid_h1_name", descKey: "ohrid_h1_desc" },
      { nameKey: "ohrid_h2_name", descKey: "ohrid_h2_desc" },
      { nameKey: "ohrid_h3_name", descKey: "ohrid_h3_desc" },
      { nameKey: "ohrid_h4_name", descKey: "ohrid_h4_desc" },
    ],
    rating: 4.7,
    places_count: 28,
    avg_budget: "$35-50 per day",
    language: "Macedonian",
    currency: "Macedonian Denar (MKD)",
    timezone: "UTC+1 (CET)",
  },
  "4": {
    id: "4",
    name: "Prizren",
    country: "Kosovo",
    descKey: "prizren_description",
    locationKey: "prizren_location",
    bestTimeKey: "prizren_best_time",
    hero_image: createImageUrl("1506905925346-21bda4d32df4", 1200, 600),
    images: [
      "https://i.pinimg.com/736x/a7/56/54/a75654929b8a52c5ecdd23bafad7037a.jpg",
      "https://i.pinimg.com/736x/9a/c3/88/9ac3880a05c8ed58b6b2b523da3e2923.jpg",
      "https://i.pinimg.com/736x/7c/6c/8c/7c6c8cfd30896d4bb4341d4d16eee2bc.jpg",
      "https://i.pinimg.com/1200x/dd/2d/64/dd2d641b0bd0eccdf07c141d235ebb7c.jpg",
    ],
    highlightKeys: [
      { nameKey: "prizren_h1_name", descKey: "prizren_h1_desc" },
      { nameKey: "prizren_h2_name", descKey: "prizren_h2_desc" },
      { nameKey: "prizren_h3_name", descKey: "prizren_h3_desc" },
      { nameKey: "prizren_h4_name", descKey: "prizren_h4_desc" },
    ],
    rating: 4.6,
    places_count: 24,
    avg_budget: "$30-45 per day",
    language: "Albanian, Turkish",
    currency: "Euro (EUR)",
    timezone: "UTC+1 (CET)",
  },
  "5": {
    id: "5",
    name: "Gjirokastër",
    country: "Albania",
    descKey: "gjirokaster_description",
    locationKey: "gjirokaster_location",
    bestTimeKey: "gjirokaster_best_time",
    hero_image: createImageUrl("1506905925346-21bda4d32df4", 1200, 600),
    images: [
      "https://i.pinimg.com/1200x/75/8c/b1/758cb1f29aff357549700f4fcc387b73.jpg",
      "https://i.pinimg.com/736x/12/e4/e7/12e4e7006ad878dcc1085825d4309a39.jpg",
      "https://i.pinimg.com/1200x/b3/be/a1/b3bea137ee1de0960c07d44b646f8cd5.jpg",
      "https://i.pinimg.com/control1/1200x/a3/89/c2/a389c2f212b3119c9384925ef130b9cd.jpg",
    ],
    highlightKeys: [
      { nameKey: "gjirokaster_h1_name", descKey: "gjirokaster_h1_desc" },
      { nameKey: "gjirokaster_h2_name", descKey: "gjirokaster_h2_desc" },
      { nameKey: "gjirokaster_h3_name", descKey: "gjirokaster_h3_desc" },
      { nameKey: "gjirokaster_h4_name", descKey: "gjirokaster_h4_desc" },
    ],
    rating: 4.7,
    places_count: 19,
    avg_budget: "$35-50 per day",
    language: "Albanian",
    currency: "Albanian Lek (ALL)",
    timezone: "UTC+1 (EET)",
  },
  "6": {
    id: "6",
    name: "Budva",
    country: "Montenegro",
    descKey: "budva_description",
    locationKey: "budva_location",
    bestTimeKey: "budva_best_time",
    hero_image: createImageUrl("1507003211169-0a1dd7228f2d", 1200, 600),
    images: [
      "https://i.pinimg.com/736x/9e/f9/cd/9ef9cd2e2d7095cba610bd147674d817.jpg",
      "https://i.pinimg.com/736x/2e/12/57/2e12578795d52bb931e618fb1b14943e.jpg",
      "https://i.pinimg.com/736x/cd/74/a6/cd74a64e55a4a6318a26e0a8c50a3908.jpg",
      "https://i.pinimg.com/736x/30/68/de/3068de071c1451c84ea6fe2de5e564c1.jpg",
    ],
    highlightKeys: [
      { nameKey: "budva_h1_name", descKey: "budva_h1_desc" },
      { nameKey: "budva_h2_name", descKey: "budva_h2_desc" },
      { nameKey: "budva_h3_name", descKey: "budva_h3_desc" },
      { nameKey: "budva_h4_name", descKey: "budva_h4_desc" },
    ],
    rating: 4.5,
    places_count: 31,
    avg_budget: "$45-65 per day",
    language: "Montenegrin",
    currency: "Euro (EUR)",
    timezone: "UTC+1 (CET)",
  },
  "7": {
    id: "7",
    name: "Pejë",
    country: "Kosovo",
    descKey: "peje_description",
    locationKey: "peje_location",
    bestTimeKey: "peje_best_time",
    hero_image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop&q=80&auto=format",
    images: [
      "https://i.pinimg.com/736x/36/6c/4d/366c4d7851c9172943b53aada8643893.jpg",
      "https://i.pinimg.com/1200x/e0/da/70/e0da7046a3a544d8abde33374cb37e5e.jpg",
      "https://i.pinimg.com/736x/0a/7b/02/0a7b027c72ed3c860c7c6477c17453ae.jpg",
      "https://i.pinimg.com/736x/6a/86/ce/6a86cecc040ce59bd9adff3a3bde8803.jpg",
    ],
    highlightKeys: [
      { nameKey: "peje_h1_name", descKey: "peje_h1_desc" },
      { nameKey: "peje_h2_name", descKey: "peje_h2_desc" },
      { nameKey: "peje_h3_name", descKey: "peje_h3_desc" },
      { nameKey: "peje_h4_name", descKey: "peje_h4_desc" },
    ],
    rating: 4.8,
    places_count: 22,
    avg_budget: "$35-55 per day",
    language: "Albanian",
    currency: "Euro (EUR)",
    timezone: "UTC+1 (CET)",
  },
  "8": {
    id: "8",
    name: "Skopje",
    country: "North Macedonia",
    descKey: "skopje_description",
    locationKey: "skopje_location",
    bestTimeKey: "skopje_best_time",
    hero_image: createImageUrl("1507003211169-0a1dd7228f2d", 1200, 600),
    images: [
      "https://i.pinimg.com/1200x/5b/d1/10/5bd110d4b9f29bd92411fdb8388caf34.jpg",
      "https://i.pinimg.com/736x/74/04/6b/74046bdcba11c4dab4169df4281239e4.jpg",
      "https://i.pinimg.com/736x/81/e9/53/81e9534f328cb8b5762e7b3534cd1b92.jpg",
      "https://i.pinimg.com/1200x/86/56/3b/86563ba7dd927ca7d27db9d0ec068625.jpg",
    ],
    highlightKeys: [
      { nameKey: "skopje_h1_name", descKey: "skopje_h1_desc" },
      { nameKey: "skopje_h2_name", descKey: "skopje_h2_desc" },
      { nameKey: "skopje_h3_name", descKey: "skopje_h3_desc" },
      { nameKey: "skopje_h4_name", descKey: "skopje_h4_desc" },
    ],
    rating: 4.4,
    places_count: 45,
    avg_budget: "$40-60 per day",
    language: "Macedonian",
    currency: "Macedonian Denar (MKD)",
    timezone: "UTC+1 (CET)",
  },
};

const destinationService = async () => {
  const lang = i18n.language ?? "en";

  const getDestinationById = async (id: string): Promise<Destination | null> => {
    const cacheKey = `${id}_${lang}`;
    const cached = destinationCache.get(cacheKey);
    const cacheTime = cacheTimestamps.get(cacheKey);

    if (cached && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
      return cached;
    }

    // Destination content is curated in-code (with i18n keys) — there is no
    // "destinations" table in Supabase, so no remote lookup is attempted.
    const mock = mockDestinations[id];
    if (!mock) return null;
    const translated = translateDestination(mock);
    destinationCache.set(cacheKey, translated);
    cacheTimestamps.set(cacheKey, Date.now());
    return translated;
  };

  const getAllDestinations = async (): Promise<Destination[]> => {
    const allCached = Object.keys(mockDestinations).every((id) => {
      const cacheTime = cacheTimestamps.get(`${id}_${lang}`);
      return cacheTime && Date.now() - cacheTime < CACHE_DURATION;
    });

    if (allCached) {
      return Object.keys(mockDestinations).map(
        (id) => destinationCache.get(`${id}_${lang}`)!
      );
    }

    const translated = Object.values(mockDestinations).map(translateDestination);
    translated.forEach((dest) => {
      destinationCache.set(`${dest.id}_${lang}`, dest);
      cacheTimestamps.set(`${dest.id}_${lang}`, Date.now());
    });
    return translated;
  };

  const clearCache = () => {
    destinationCache.clear();
    cacheTimestamps.clear();
  };

  const getCacheStats = () => ({
    cachedCount: destinationCache.size,
    cacheSize: new Blob([JSON.stringify(Array.from(destinationCache.values()))]).size,
    oldestEntry: cacheTimestamps.size > 0
      ? Math.min(...Array.from(cacheTimestamps.values()))
      : null,
  });

  return { getDestinationById, getAllDestinations, clearCache, getCacheStats };
};

export default destinationService;
