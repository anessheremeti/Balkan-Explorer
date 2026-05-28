import { supabase } from "../../createClient";
import type { PostgrestError, Session } from "@supabase/supabase-js";
import type { BaseUser } from "../Interfaces/User";

export const usersService = () => {

  const storeAccessToken = (session: Session | null) => {
    if (typeof window === "undefined") return;

    if (session?.access_token) {
      sessionStorage.setItem("access_token", session.access_token);
      sessionStorage.setItem("user_id", session.user.id);
    }
  };

  const clearAccessToken = () => {
    if (typeof window === "undefined") return;

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user_id");
  };

  const getUserName = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();

      if (error && (error as PostgrestError).code !== "PGRST116") {
        throw error;
      }
      console.log("Fetched user name:", data);
      return data?.full_name ?? null;

    } catch (error) {
      console.error("Error fetching user name:", error);
      return null;
    }
  };



  const getUserEmail = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();

      if (error && (error as PostgrestError).code !== "PGRST116") {
        throw error;
      }

      return data?.email ?? null;

    }   catch (error) {
      console.error("Error fetching user email:", error);
      return null;
    }
  }

  const getAvatarUrl = async (userId: string) => {
    try{
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .maybeSingle();

        if (error && (error as PostgrestError).code !== "PGRST116") {
        throw error;
      }
      return data?.avatar_url ?? null;

    }
    catch(error){
      console.error("Error fetching avatar URL:", error);
      return null;
    }
  }
  const signUpUser = async (user: BaseUser) => {
    try {

      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.full_name,
          },
        },
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error("User creation failed.");
      }

      // store session if available
      storeAccessToken(data.session ?? null);

      // create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: data.user.id,
            full_name: user.full_name,
            email: user.email
          }
        ]);

      if (profileError) {
        console.error("Profile creation failed:", profileError);
        throw new Error("Profile could not be created.");
      }

      const { migrateGuestTrips } = await import("./submitService");
      await migrateGuestTrips(data.user.id);

      return data.user;

    } catch (error: unknown) {

      console.error("Registration error:", error);

      throw new Error(
        error instanceof Error ? error.message : "Registration failed."
      );
    }
  };

  const signInUser = async (user: BaseUser) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });

      if (error) throw error;

      storeAccessToken(data.session ?? null);

      const { migrateGuestTrips } = await import("./submitService");
      await migrateGuestTrips(data.user.id);

      return data.user;

    } catch {
      throw new Error("Email or password is incorrect.");
    }
  };

  return {
    signUpUser,
    signInUser,
    getUserName,
    clearAccessToken,
    getUserEmail,
    getAvatarUrl
  };
};