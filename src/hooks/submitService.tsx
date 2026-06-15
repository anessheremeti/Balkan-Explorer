import { supabase } from "../../createClient";
import { API_BASE } from "../constants/api";
import { Analytics } from "../lib/analytics";

export interface TripData {
  title: string;
  budget_total: number;
  currency: string;
  starting_location: string;
  destination: string;
  starting_date: string;
  returning_date: string;
  travel_style: string;
  travelers: number;
}

/**
 * After login/signup: move all trips owned by the localStorage guest_id
 * to the now-authenticated user. Clears guest_id from localStorage on success.
 * Safe to call even if there are no guest trips — it is a no-op in that case.
 */
export const migrateGuestTrips = async (authenticatedUserId: string): Promise<void> => {
  const guestId = localStorage.getItem("guest_id");
  if (!guestId || !authenticatedUserId) return;

  try {
    const res = await fetch(`${API_BASE}/api/trips/migrate-guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, userId: authenticatedUserId }),
    });

    if (!res.ok) {
      console.error("❌ Guest migration failed:", await res.text());
      return;
    }

    const { migrated } = await res.json();
    console.log(`✅ Migrated ${migrated} guest trip(s) to user ${authenticatedUserId}`);
    localStorage.removeItem("guest_id");
  } catch (err) {
    // Non-fatal — user is authenticated, migration can be retried on next login
    console.error("❌ Guest migration error:", err);
  }
};

/**
 * ✅ FAST ENDPOINT: Returns in ~1-2 seconds, generates in background
 */
const submitServiceWithItineraryFast = async (tripData: TripData) => {
  const userId = sessionStorage.getItem("user_id"); // null for guests
  const guestId = localStorage.getItem("guest_id"); // always set for guests
  try {
    const response = await fetch(`${API_BASE}/api/trips/create-fast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripData,
        userId,   // null when guest — server handles appropriately
        guestId,  // always the localStorage value
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create trip");
    }

    const result = await response.json();
    console.log("✅ Trip created instantly:", result.trip);
    Analytics.tripCreated(tripData.destination);
    return result;

  } catch (error) {
    console.error("❌ Error in submitServiceWithItineraryFast:", error);
    throw error;
  }
};

/**
 * ✅ Poll for itinerary completion
 */
const pollItineraryCompletion = async (
  tripId: string,
  maxAttempts = 30,
  onProgress?: (attempt: number, maxAttempts: number) => void
): Promise<boolean> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `${API_BASE}/api/trips/${tripId}/itinerary-status`
      );
      const { ready } = await response.json();

      onProgress?.(attempt + 1, maxAttempts);

      if (ready) {
        console.log("✅ Itinerary ready!");
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err) {
      console.error("Polling error:", err);
    }
  }

  console.warn("⏱️  Timeout: Itinerary still generating after 60 seconds");
  return false;
};

/**
 * NEW: Call backend endpoint to create trip + generate + save itinerary
 */
const submitServiceWithItinerary = async (tripData: TripData) => {
 // const guestId = localStorage.getItem('guest_id')
 //let  guest_id = guestId
  try {
    const response = await fetch(`${API_BASE}/api/trips/create-with-itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripData,
        userId: sessionStorage.getItem("user_id"),
        guestId: localStorage.getItem("guest_id"),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create trip");
    }

    const result = await response.json();
    console.log("✅ Trip + Itinerary created:", result.trip);
    return result.trip;

  } catch (error) {
    console.error("❌ Error in submitServiceWithItinerary:", error);
    throw error;
  }
};

/**
 * LEGACY: Keep old endpoint for backward compatibility
 */
const submitService = async (Trip: TripData) => {
  try {
    const { data, error } = await supabase.from("trips").insert([Trip]);
    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error("Error submitting data:", error);
    return null;
  }
};

export { submitServiceWithItinerary, submitServiceWithItineraryFast, pollItineraryCompletion };
export default submitService;