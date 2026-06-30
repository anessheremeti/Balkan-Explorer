import { supabase } from "../../createClient";
//mport type { Trip } from "./itineraryService";

const tripService = async () => {
  const getTrips = async () => {
    const { data, error } = await supabase.from("trips").select("*");

    if (error) {
      console.error("Error fetching trip data:", error);
      throw error;
    }

    return data;
  };

  


  const getLatestTrip = async (userId: string | null, guestIdParam?: string | null) => {
    const guestId = guestIdParam ?? localStorage.getItem("guest_id");
    try {
      let query = supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (userId) {
        query = query.eq("user_id", userId);
      } else if (guestId) {
        query = query.eq("guest_id", guestId);
      } else {
        return null;
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ Error fetching latest trip:", error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;

    } catch (err) {
      console.error("❌ getLatestTrip failed:", err);
      return null;
    }
  }
      
 

  return {
    getTrips,
    getLatestTrip
  };
};
export default tripService;
