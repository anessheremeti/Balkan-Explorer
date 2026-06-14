import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../createClient";


export const usersService = () => {

 

  const getItineraryDays = async (tripId:string) => {
    try {
      const { data } = await supabase
        .from("itinerary_days")
        .select("*")
        .eq("trip_id",tripId)
        .maybeSingle();

    

      return data || null

    } catch (error) {
      console.error("Error fetching user name:", error);
      return null;
    }
  };

  const getItineraryItems = async (itinerayDayId: string,placeId:string) => {
    try {
      const { data, error } = await supabase
        .from("itinerary")
        .select("*")
        .match({'itinerary_day_id':itinerayDayId,"place_id":placeId})
        .maybeSingle();

      if (error && (error as PostgrestError).code !== "PGRST116") {
        throw error;
      }

      return data || null;

    }   catch (error) {
      console.error("Error fetching user email:", error);
      return null;
    }
  }




  return {
    getItineraryDays,
    getItineraryItems
  };
};