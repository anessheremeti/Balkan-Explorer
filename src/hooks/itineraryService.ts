import { supabase } from "../../createClient";


export interface ItineraryItemMetadata {
  source?: string;
  place_id?: string | null;
  lat?: number | null;
  lon?: number | null;
  photo_query?: string | null;
  name_local?: string | null;
  [key: string]: unknown;
}

export interface ItineraryItem {
  id: string;
  itinerary_day_id: string;
  item_type: string;
  title: string;
  description: string;
  start_time: string;
  created_at: string;
  metadata: ItineraryItemMetadata | null;
  place: {
    rating?: number | null;
    review_count?: number | null;
    image_url?: string | null;
    price_level?: string | null;
    [key: string]: unknown;
  } | null;
  // Present when item arrives from the in-memory fast-serve cache (not yet persisted)
  _name_local?: string | null;
  _lat?: number | null;
  _lon?: number | null;
  _photo_query?: string | null;
}

export interface ItineraryDay {
  id: string;
  trip_id: string;
  day_number: number;
  title: string;
  date: string;
  itinerary_items: ItineraryItem[];
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  starting_location: string;
  starting_date: string;
  returning_date: string;
  travel_style: string;
  travelers: number;
  budget_total: number;
  currency: string;
  created_at: string;
  updated_at: string;
  itinerary_days?: ItineraryDay[];
}

export interface ItineraryResponse {
  trip: Trip | null;
  days: ItineraryDay[];
  isLoading: boolean;
  error: string | null;
}

/**
 * ✅ FUNCTION 1: Get Latest Trip for User
 * 
 * Logic:
 * - Fetch ALL trips for user (ordered by created_at DESC)
 * - Return ONLY the first (latest) trip
 * - If no trips, return null
 */
export async function getUserTripsWithLatestItinerary(
  userId: string | null, guestId?: string | null
): Promise<Trip | null> {
  try {
    if (!userId && !guestId) {
      throw new Error("User ID or guest ID is required");
    }

    let query = supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    query = userId ? query.eq("user_id", userId) : query.eq("guest_id", guestId!);

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching user trips:", error);
      throw error;
    }

    // Return only the latest trip (first result)
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error("❌ getUserTripsWithLatestItinerary failed:", err);
    return null;
  }
}

/**
 * ✅ FUNCTION 2: Get Full Itinerary for a Trip
 * 
 * Includes:
 * - Trip data
 * - Itinerary days (ordered by day_number ASC)
 * - Itinerary items per day (ordered by start_time ASC)
 */
export async function getItineraryByTripId(
  tripId: string
): Promise<ItineraryResponse> {
  const response: ItineraryResponse = {
    trip: null,
    days: [],
    isLoading: false,
    error: null,
  };

  try {
    if (!tripId) {
      throw new Error("Trip ID is required");
    }

    // ✅ Fetch trip with nested itinerary_days and itinerary_items
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .select(`
        *,
        itinerary_days(
          id,
          trip_id,
          day_number,
          title,
          date,
          itinerary_items(
            id,
            itinerary_day_id,
            item_type,
            title,
            description,
            start_time,
            end_time,
            metadata
          )
        )
      `)
      .eq("id", tripId)
      .single();

    if (tripError) {
      console.error("❌ Error fetching itinerary:", tripError);
      throw tripError;
    }

    if (!tripData) {
      console.warn("⚠️  No trip found with ID:", tripId);
      response.error = "Trip not found";
      return response;
    }

    // ✅ Sort days by day_number ASC
    const sortedDays = ((tripData.itinerary_days || []) as ItineraryDay[]).sort(
      (a, b) => a.day_number - b.day_number
    );

    // ✅ Sort items within each day by start_time ASC
    const daysWithSortedItems = sortedDays.map((day: ItineraryDay) => ({
      ...day,
      itinerary_items: (day.itinerary_items || []).sort((a, b) => {
        // Compare time strings (HH:MM:SS format)
        return a.start_time.localeCompare(b.start_time);
      }),
    }));

    response.trip = tripData;
    response.days = daysWithSortedItems;
    response.error = null;

   // console.log(`✅ Itinerary loaded: ${daysWithSortedItems.length} days`);
    return response;
  } catch (err) {
    console.error("❌ getItineraryByTripId failed:", err);
    response.error = (err instanceof Error ? err.message : "Unknown error");
    return response;
  }
}

/**
 * ✅ BONUS: Combined function to fetch latest trip's itinerary
 * 
 * Combines both functions in one call for efficiency
 */
export async function getLatestTripItinerary(
  userId: string | null, guestId?: string | null
): Promise<ItineraryResponse> {
  const response: ItineraryResponse = {
    trip: null,
    days: [],
    isLoading: false,
    error: null,
  };
  try {
    // Step 1: Get latest trip
    const latestTrip = await getUserTripsWithLatestItinerary(userId, guestId);

    if (!latestTrip) {
      console.warn("⚠️  No trips found for user/guest:", userId ?? guestId);
      response.error = "No trips found. Start by creating a new trip!";
      return response;
    }

    // Step 2: Get itinerary for that trip
    return await getItineraryByTripId(latestTrip.id);
  } catch (err) {
    console.error("❌ getLatestTripItinerary failed:", err);
    response.error = (err instanceof Error ? err.message : "Unknown error");
    return response;
  }
}
