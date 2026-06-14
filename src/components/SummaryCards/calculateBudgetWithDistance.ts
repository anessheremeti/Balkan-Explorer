// calculateBudgetWithDistance.ts
import { type Trip } from "../../hooks/itineraryService";

/**
 * ✅ REQUEST DEDUPLICATION & RETRY LOGIC
 * 
 * If future features need geocoding, these utilities provide:
 * - In-flight request deduplication
 * - Exponential backoff for rate limiting
 * - Automatic retry on 429 errors
 */
//const inFlightRequests = new Map<string, Promise<{ lat: number; lon: number }>>();

 /* async function fetchWithRetry(
  url: string,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url);

      // Retry on 429 (Too Many Requests) with exponential backoff
      if (res.status === 429) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.warn(`🔄 Rate limited, retry in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`🔄 Network error, retry in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Max retries exceeded");
}
  */

/**
 * ✅ SIMPLIFIED BUDGET CALCULATION
 * 
 * Best practice: Don't over-engineer budget calculations.
 * - Use pre-defined averages per destination/region
 * - Only geocode when absolutely necessary
 * - For Balkan region, use typical regional estimates
 */

// Regional average costs (simplified, in USD per day per person)
const REGIONAL_COSTS: Record<string, { accommodation: number; activities: number; food: number }> = {
  albania: { accommodation: 40, activities: 25, food: 15 },
  kosovo: { accommodation: 35, activities: 20, food: 12 },
  montenegro: { accommodation: 50, activities: 30, food: 18 },
  "north macedonia": { accommodation: 30, activities: 18, food: 10 },
  default: { accommodation: 45, activities: 25, food: 15 },
};

function getRegionFromDestination(destination: string): string {
  const lower = destination.toLowerCase();
  for (const region of Object.keys(REGIONAL_COSTS)) {
    if (region !== "default" && lower.includes(region)) {
      return region;
    }
  }
  return "default";
}

interface BudgetBreakdown {
  total_budget: number;
  currency: string;
  breakdown: {
    per_traveler: number;
    transport: number;
    fuel: number;
    accommodation: number;
    tour: number;
  };
  notes: string;
}

export async function calculateBudgetWithDistance(trip: Trip): Promise<BudgetBreakdown> {
  const { budget_total, starting_date, returning_date, travelers, travel_style, destination, currency } = trip;
  const duration = Math.ceil(
    (new Date(returning_date).getTime() - new Date(starting_date).getTime()) / 86_400_000
  );

  try {
    // ✅ ONLY geocode destination (skip starting_location)
    // We use pre-defined regional costs instead of calculating from distance
    const region = getRegionFromDestination(destination);
    const regionCosts = REGIONAL_COSTS[region] || REGIONAL_COSTS.default;

    // Cost breakdown based on travel style and region
    const accommodationPerDay = regionCosts.accommodation;
    const activitiesPerDay = regionCosts.activities;
    const foodPerDay = regionCosts.food;

    let transportCost = 0;
    let fuelCost = 0;

    // Estimate transport based on travel_style (fixed estimates instead of distance)
    if (travel_style === "road") {
      // Ballpark for Balkan region: ~150-300 km typical, ~$1.50/L, ~12 L/100km
      // Average ~$60-120 for the trip
      fuelCost = Math.round(100 * travelers * 0.8); // Rough average
    } else if (travel_style === "bus") {
      // Bus in Balkans ~$0.10-0.15 per km per person
      // Typical trip ~200km = $20-30 per person
      transportCost = Math.round(25 * travelers);
    } else if (travel_style === "plane") {
      // Plane costs highly variable; use fixed average
      transportCost = Math.round(150 * travelers);
    }

    // Calculate accommodation and activities
    const accommodation = accommodationPerDay * duration * travelers;
    const activities = activitiesPerDay * duration * travelers;
    const food = foodPerDay * duration * travelers;

    // Total before scaling
    const rawTotal = accommodation + activities + food + transportCost + fuelCost;

    // Scale if over budget
    const scale = rawTotal > budget_total ? budget_total / rawTotal : 1;

    const scaledAccommodation = Math.round(accommodation * scale);
    const scaledActivities = Math.round(activities * scale);
    const scaledFood = Math.round(food * scale);
    const scaledTransport = Math.round(transportCost * scale);
    const scaledFuel = Math.round(fuelCost * scale);

    const perTraveler =
      Math.round(
        ((scaledAccommodation + scaledActivities + scaledFood + scaledTransport + scaledFuel) / travelers) * 100
      ) / 100;

    const notesArray = [
      `Regional estimate: ${region.charAt(0).toUpperCase() + region.slice(1)}`,
    ];
    if (scale < 1) {
      notesArray.push("Budget scaled down");
    }

    return {
      total_budget: Math.round(rawTotal * scale),
      currency,
      breakdown: {
        per_traveler: perTraveler,
        transport: scaledTransport,
        fuel: scaledFuel,
        accommodation: scaledAccommodation,
        tour: scaledActivities,
      },
      notes: notesArray.join(". "),
    };
  } catch (err) {
    console.error("❌ Budget calculation error:", err);

    // Graceful fallback: return default budget estimates
    const basePerPerson = budget_total / (Math.max(travelers, 1) * Math.max(duration, 1));
    const breakdown = {
      accommodation: Math.round((basePerPerson * 0.5) * duration * travelers),
      tour: Math.round((basePerPerson * 0.25) * duration * travelers),
      transport: Math.round((basePerPerson * 0.15) * duration * travelers),
      fuel: Math.round((basePerPerson * 0.1) * duration * travelers),
    };

    return {
      total_budget: budget_total,
      currency,
      breakdown: {
        per_traveler: basePerPerson,
        transport: breakdown.transport,
        fuel: breakdown.fuel,
        accommodation: breakdown.accommodation,
        tour: breakdown.tour,
      },
      notes: "Using default estimates (error calculating regional budget)",
    };
  }
}