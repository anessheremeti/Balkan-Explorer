import { supabase } from "../../createClient";

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

// Image optimization helper - creates responsive image URLs
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

// Cache for destinations - improves performance on repeated requests
const destinationCache = new Map<string, Destination>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
const cacheTimestamps = new Map<string, number>();

const destinationService = async () => {
  // Comprehensive mock data for all 8 Balkan destinations with real Unsplash images
  const mockDestinations: Record<string, Destination> = {
    "1": {
      id: "1",
      name: "Sarandë",
      country: "Albania",
      description:
        "The unofficial capital of the Albanian Riviera, Sarandë is a charming coastal town known for its deep blue waters, vibrant nightlife, and pristine beaches. This picturesque destination offers the perfect blend of relaxation and adventure, with exceptional water sports and fresh Mediterranean cuisine.",
      location: "South-western Coastal Albania",
      hero_image: createImageUrl("1507003211169-0a1dd7228f2d", 1200, 600),
      images: [
        "https://i.pinimg.com/1200x/cb/70/00/cb7000acab9fa010951fe1ac7796fb96.jpg",
        "https://i.pinimg.com/736x/11/0a/6b/110a6b880a27f1920b8ae8ba6ffd90f6.jpg",
        "https://i.pinimg.com/736x/d9/4b/70/d94b70e91c45c4e53a284ece46b86f7b.jpg",
        "https://i.pinimg.com/736x/d9/4b/70/d94b70e91c45c4e53a284ece46b86f7b.jpg",
      ],
      highlights: [
        { name: "Ksamil Islands", description: "Three idyllic islands with crystal-clear turquoise waters" },
        { name: "Blue Eye Spring", description: "Natural freshwater spring with mesmerizing blue hue" },
        { name: "Nightlife & Dining", description: "Vibrant beachfront restaurants and bars" },
        { name: "Water Sports", description: "Diving, snorkeling, and boat tours" },
      ],
      rating: 4.8,
      places_count: 42,
      best_time_to_visit: "May to September",
      avg_budget: "$40-60 per day",
      language: "Albanian",
      currency: "Albanian Lek (ALL)",
      timezone: "UTC+1 (EET)",
    },
    "2": {
      id: "2",
      name: "Kotor",
      country: "Montenegro",
      description:
        "A medieval fortified town nestled in Montenegro's most stunning bay on the Adriatic coast. Kotor is a UNESCO World Heritage site featuring narrow winding streets, historic architecture, and dramatic mountain backdrops. The town combines Mediterranean charm with Alpine beauty.",
      location: "Bay of Kotor, Southern Montenegro",
      // Real hero image: Kotor Bay from mountains overlooking the old town
      hero_image: "https://images.unsplash.com/photo-1581234720562-40cb08b2d57d?w=1200&h=600&fit=crop&q=80&auto=format",
      images: [
        // Kotor Old Town - winding cobblestone streets with Venetian architecture
        "https://i.pinimg.com/736x/b3/29/93/b329934b5e23efedf982109687d64a3f.jpg",
        // Saint Tryphon Cathedral - the main historic cathedral in the center
        "https://i.pinimg.com/1200x/19/8d/22/198d22f6d8c5226ada173984436ada9f.jpg",
        // Kotor Bay waterfront - beautiful Mediterranean bay setting
        "https://i.pinimg.com/1200x/bc/c0/8a/bcc08a0ae3d4d2651574a914e4599e1a.jpg",
        // City walls and fortress - hiking up the historic walls with views
        "https://i.pinimg.com/1200x/55/27/b6/5527b6e0dd7bd499bd380f5e7224ae35.jpg",
      ],
      highlights: [
        { 
          name: "Old Town (Stari Grad)", 
          description: "UNESCO-listed medieval walled city with narrow cobblestone streets, Venetian buildings from 15th-18th centuries, and historic squares" 
        },
        { 
          name: "Saint Tryphon Cathedral", 
          description: "12th-century Romanesque cathedral with stunning bell towers, the main religious monument in the old town" 
        },
        { 
          name: "City Walls & Fortress", 
          description: "4.5 km of historic defensive walls offering panoramic views of the Bay and surrounding mountains - great hiking destination" 
        },
        { 
          name: "Kotor Bay (Boka Kotorska)", 
          description: "Europe's most southerly fjord, surrounded by dramatic limestone cliffs and charming villages" 
        },
      ],
      rating: 4.9,
      places_count: 35,
      best_time_to_visit: "April to October",
      avg_budget: "$50-75 per day",
      language: "Montenegrin",
      currency: "Euro (EUR)",
      timezone: "UTC+1 (CET)",
    },
    "3": {
      id: "3",
      name: "Ohrid",
      country: "North Macedonia",
      description:
        "One of Europe's oldest human settlements and a major pilgrimage destination, Ohrid is famous for its 365 churches (one for each day of the year) and the crystal-clear glacial Lake Ohrid. This magical town on the UNESCO World Heritage list offers spiritual tranquility and natural beauty.",
      location: "South-western North Macedonia",
      hero_image: createImageUrl("1470114716159-e389f8014d41", 1200, 600),
       images: [
        "https://i.pinimg.com/1200x/b6/40/01/b640013b802b0b0b7319fed474472a30.jpg",
        "https://i.pinimg.com/1200x/3f/2e/bb/3f2ebb454109e5d550a83b26a7eebc0d.jpg",
        "https://i.pinimg.com/1200x/bc/c0/8a/bcc08a0ae3d4d2651574a914e4599e1a.jpg",
        "https://i.pinimg.com/736x/be/33/ba/be33ba2f1254f949f3a97617ba7acc65.jpg",
      ],
      highlights: [
        { name: "Lake Ohrid", description: "Europe's deepest Balkan lake with pristine waters" },
        { name: "Samuel's Fortress", description: "Ancient fortress overlooking the town and lake" },
        { name: "Churches & Monasteries", description: "362+ Orthodox churches and monasteries" },
        { name: "Old Town", description: "Charming medieval streets with traditional architecture" },
      ],
      rating: 4.7,
      places_count: 28,
      best_time_to_visit: "May to September",
      avg_budget: "$35-50 per day",
      language: "Macedonian",
      currency: "Macedonian Denar (MKD)",
      timezone: "UTC+1 (CET)",
    },
    "4": {
      id: "4",
      name: "Prizren",
      country: "Kosovo",
      description:
        "The cultural capital of Kosovo, Prizren is nestled at the foot of the impressive Sharr Mountains. This historic town seamlessly blends Ottoman heritage with Balkan culture, featuring stunning mosques, churches, and traditional bazaars along the Lumbardhi River.",
      location: "South-western Kosovo",
      hero_image: createImageUrl("1506905925346-21bda4d32df4", 1200, 600),
      images: [
        "https://i.pinimg.com/736x/a7/56/54/a75654929b8a52c5ecdd23bafad7037a.jpg",
        "https://i.pinimg.com/736x/9a/c3/88/9ac3880a05c8ed58b6b2b523da3e2923.jpg",
        "https://i.pinimg.com/736x/7c/6c/8c/7c6c8cfd30896d4bb4341d4d16eee2bc.jpg",
        "https://i.pinimg.com/1200x/dd/2d/64/dd2d641b0bd0eccdf07c141d235ebb7c.jpg",
      ],
      highlights: [
        { name: "Old Bazaar", description: "Historic Ottoman marketplace with traditional crafts" },
        { name: "Holy Savior Church", description: "Stunning medieval Orthodox church with intricate frescoes" },
        { name: "Sinan Pasha Mosque", description: "Beautifully preserved Ottoman-era mosque" },
        { name: "Sharr Mountains", description: "Dramatic mountain scenery and hiking trails" },
      ],
      rating: 4.6,
      places_count: 24,
      best_time_to_visit: "April to October",
      avg_budget: "$30-45 per day",
      language: "Albanian, Turkish",
      currency: "Euro (EUR)",
      timezone: "UTC+1 (CET)",
    },
    "5": {
      id: "5",
      name: "Gjirokastër",
      country: "Albania",
      description:
        "A UNESCO World Heritage site known as the 'Stone City', Gjirokastër is famous for its distinctive Ottoman-era stone houses stacked dramatically on a hillside. This architectural marvel offers a glimpse into Balkan history with its fortress, bazaar, and unique aesthetic.",
      location: "South-eastern Albania",
      hero_image: createImageUrl("1506905925346-21bda4d32df4", 1200, 600),
        images: [
        "https://i.pinimg.com/1200x/75/8c/b1/758cb1f29aff357549700f4fcc387b73.jpg",
        "https://i.pinimg.com/736x/12/e4/e7/12e4e7006ad878dcc1085825d4309a39.jpg",
        "https://i.pinimg.com/1200x/b3/be/a1/b3bea137ee1de0960c07d44b646f8cd5.jpg",
        "https://i.pinimg.com/control1/1200x/a3/89/c2/a389c2f212b3119c9384925ef130b9cd.jpg",
      ],
      highlights: [
        { name: "Stone Houses", description: "Iconic Ottoman-style stone architecture on steep hillside" },
        { name: "Gjirokastër Fortress", description: "Imposing castle offering panoramic city views" },
        { name: "Bazaar", description: "Vibrant traditional marketplace with local goods" },
        { name: "Ali Pasha Museum", description: "Historic museum in a beautifully preserved mansion" },
      ],
      rating: 4.7,
      places_count: 19,
      best_time_to_visit: "April to October",
      avg_budget: "$35-50 per day",
      language: "Albanian",
      currency: "Albanian Lek (ALL)",
      timezone: "UTC+1 (EET)",
    },
    "6": {
      id: "6",
      name: "Budva",
      country: "Montenegro",
      description:
        "The center of Montenegrin tourism and a lively coastal resort, Budva offers a perfect mix of medieval charm and modern beach culture. With its sandy beaches, historic walled Old Town, and vibrant nightlife, it's an ideal destination for diverse travelers.",
      location: "Central Montenegrin Coast",
      hero_image: createImageUrl("1507003211169-0a1dd7228f2d", 1200, 600),
       images: [
        "https://i.pinimg.com/736x/9e/f9/cd/9ef9cd2e2d7095cba610bd147674d817.jpg",
        "https://i.pinimg.com/736x/2e/12/57/2e12578795d52bb931e618fb1b14943e.jpg",
        "https://i.pinimg.com/736x/cd/74/a6/cd74a64e55a4a6318a26e0a8c50a3908.jpg",
        "https://i.pinimg.com/736x/30/68/de/3068de071c1451c84ea6fe2de5e564c1.jpg",
      ],
      highlights: [
        { name: "Old Town", description: "Medieval walled city with narrow streets and historic sites" },
        { name: "Sandy Beaches", description: "Riviera's best beaches with crystal-clear waters" },
        { name: "Nightlife", description: "Vibrant bars, clubs, and beachfront restaurants" },
        { name: "Island Hopping", description: "Nearby islands perfect for day trips" },
      ],
      rating: 4.5,
      places_count: 31,
      best_time_to_visit: "May to September",
      avg_budget: "$45-65 per day",
      language: "Montenegrin",
      currency: "Euro (EUR)",
      timezone: "UTC+1 (CET)",
    },
    "7": {
      id: "7",
      name: "Pejë",
      country: "Kosovo",
      description:
        "The gateway to the spectacular Rugova Canyon and the Accursed Mountains, Pejë is a paradise for outdoor enthusiasts and cultural explorers. This adventure-centric destination offers stunning gorges, hiking trails, pristine mountain scenery, alpine skiing, and rich historical heritage including the historic Patriarchate Pavilion.",
      location: "North-western Kosovo",
      // Real hero image: Rugova Canyon - dramatic white limestone gorge
      hero_image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop&q=80&auto=format",
      images: [
        // Rugova Canyon (White Drin Gorge) - spectacular limestone canyon
        "https://i.pinimg.com/736x/36/6c/4d/366c4d7851c9172943b53aada8643893.jpg",
        // Rugova Mountains panoramic view - dramatic alpine landscape
        "https://i.pinimg.com/1200x/e0/da/70/e0da7046a3a544d8abde33374cb37e5e.jpg",
        // White Drin River - turquoise river running through the canyon
          "https://i.pinimg.com/736x/0a/7b/02/0a7b027c72ed3c860c7c6477c17453ae.jpg",
        // Pejë Bazaar (Old Bazaar) - Ottoman-era market and architecture
        "https://i.pinimg.com/736x/6a/86/ce/6a86cecc040ce59bd9adff3a3bde8803.jpg",
      ],
      highlights: [
        { 
          name: "Rugova Canyon", 
          description: "Dramatic 25 km limestone gorge carved by the White Drin River - one of the most spectacular canyons in Europe with walls rising 1000+ meters" 
        },
        { 
          name: "Patriarchate Pavilion (Tekke e Pejës)", 
          description: "Historic 15th-century Ottoman-era building, important cultural and religious heritage site in the city center" 
        },
        { 
          name: "Hiking & Trekking", 
          description: "World-class trails through the Accursed (Bjeshkët e Nemuna) Mountains with pristine alpine scenery and mountain huts" 
        },
        { 
          name: "Water Sports", 
          description: "White Drin River offers rafting, kayaking, and swimming in crystal-clear turquoise waters" 
        },
      ],
      rating: 4.8,
      places_count: 22,
      best_time_to_visit: "June to September",
      avg_budget: "$35-55 per day",
      language: "Albanian",
      currency: "Euro (EUR)",
      timezone: "UTC+1 (CET)",
    },
    "8": {
      id: "8",
      name: "Skopje",
      country: "North Macedonia",
      description:
        "The vibrant capital of North Macedonia, Skopje is where history meets modernity. Known for its grand statues, ambitious reconstruction projects, and the charming Old Bazaar, Skopje offers a dynamic blend of Ottoman heritage and contemporary culture with excellent museums and restaurants.",
      location: "Central North Macedonia",
      hero_image: createImageUrl("1507003211169-0a1dd7228f2d", 1200, 600),
      images: [
        // Rugova Canyon (White Drin Gorge) - spectacular limestone canyon
        "https://i.pinimg.com/1200x/5b/d1/10/5bd110d4b9f29bd92411fdb8388caf34.jpg",
        // Rugova Mountains panoramic view - dramatic alpine landscape
        "https://i.pinimg.com/736x/74/04/6b/74046bdcba11c4dab4169df4281239e4.jpg",
        // White Drin River - turquoise river running through the canyon
          "https://i.pinimg.com/736x/81/e9/53/81e9534f328cb8b5762e7b3534cd1b92.jpg",
        // Pejë Bazaar (Old Bazaar) - Ottoman-era market and architecture
        "https://i.pinimg.com/1200x/86/56/3b/86563ba7dd927ca7d27db9d0ec068625.jpg",
      ],
      highlights: [
        { name: "Stone Bridge", description: "Historic Ottoman stone bridge spanning the Vardar River" },
        { name: "Old Bazaar", description: "Atmospheric Ottoman marketplace with cafes and shops" },
        { name: "Museum of Modern Art", description: "Impressive contemporary art collection" },
        { name: "Memorial Statues", description: "Iconic monuments throughout the city" },
      ],
      rating: 4.4,
      places_count: 45,
      best_time_to_visit: "April to May, September to October",
      avg_budget: "$40-60 per day",
      language: "Macedonian",
      currency: "Macedonian Denar (MKD)",
      timezone: "UTC+1 (CET)",
    },
  };

  const getDestinationById = async (id: string): Promise<Destination | null> => {
    try {
      // Check cache first for better performance
      const cachedDestination = destinationCache.get(id);
      const cacheTime = cacheTimestamps.get(id);
      
      if (cachedDestination && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
        console.log(`[Cache Hit] Destination ${id} retrieved from cache`);
        return cachedDestination;
      }

      // Try to fetch from Supabase first
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.warn("Supabase error:", error.message);
        // Return mock data if Supabase fails
        const mockData = mockDestinations[id] || null;
        if (mockData) {
          destinationCache.set(id, mockData);
          cacheTimestamps.set(id, Date.now());
        }
        return mockData;
      }

      const destination = data as Destination;
      // Cache the result
      destinationCache.set(id, destination);
      cacheTimestamps.set(id, Date.now());
      
      return destination;
    } catch (err) {
      console.error("Error fetching destination:", err);
      // Fallback to mock data
      const mockData = mockDestinations[id] || null;
      if (mockData) {
        destinationCache.set(id, mockData);
        cacheTimestamps.set(id, Date.now());
      }
      return mockData;
    }
  };

  const getAllDestinations = async (): Promise<Destination[]> => {
    try {
      // Check if all destinations are cached
      const allCached = Object.keys(mockDestinations).every((id) => {
        const cacheTime = cacheTimestamps.get(id);
        return cacheTime && Date.now() - cacheTime < CACHE_DURATION;
      });

      if (allCached) {
        console.log("[Cache Hit] All destinations retrieved from cache");
        return Object.values(mockDestinations);
      }

      // Try to fetch from Supabase
      const { data, error } = await supabase.from("destinations").select("*");

      if (error) {
        console.warn("Supabase error:", error.message);
        // Return mock data and cache it
        const mockData = Object.values(mockDestinations);
        mockData.forEach((dest) => {
          destinationCache.set(dest.id, dest);
          cacheTimestamps.set(dest.id, Date.now());
        });
        return mockData;
      }

      const destinations = data as Destination[];
      // Cache all results
      destinations.forEach((dest) => {
        destinationCache.set(dest.id, dest);
        cacheTimestamps.set(dest.id, Date.now());
      });

      return destinations;
    } catch (err) {
      console.error("Error fetching destinations:", err);
      // Fallback to mock data
      const mockData = Object.values(mockDestinations);
      mockData.forEach((dest) => {
        destinationCache.set(dest.id, dest);
        cacheTimestamps.set(dest.id, Date.now());
      });
      return mockData;
    }
  };

  // Clear cache function - useful for manual cache invalidation
  const clearCache = () => {
    destinationCache.clear();
    cacheTimestamps.clear();
    console.log("[Cache] All destinations cache cleared");
  };

  // Get cache statistics for debugging
  const getCacheStats = () => {
    return {
      cachedCount: destinationCache.size,
      cacheSize: new Blob([JSON.stringify(Array.from(destinationCache.values()))]).size,
      oldestEntry: cacheTimestamps.size > 0 
        ? Math.min(...Array.from(cacheTimestamps.values()))
        : null,
    };
  };

  return {
    getDestinationById,
    getAllDestinations,
    clearCache,
    getCacheStats,
  };
};

export default destinationService;
