import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  fetchPublicProfile,
  type PublicProfile,
} from "@/lib/supabase/public-profile";
import {
  computeTravelStats,
  getVisitedCountryCodes,
  getWishlistCountryCodes,
} from "@/lib/utils/stats";
import type {
  TravelStats,
  VisitedCity,
  VisitedCountry,
  VisitedPark,
  WishlistCountry,
  ProfileFollowState,
} from "@/types/database";
import { getAuthUser } from "@/lib/supabase/auth";
import { isDemoProfileUsername } from "@/lib/data/jennifer-demo-page";
import { loadProfileFollowState } from "@/lib/supabase/profile-follows";

export type PublicProfilePageData = {
  profile: PublicProfile;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  wishlistCountries: WishlistCountry[];
  stats: TravelStats;
  visitedCodes: string[];
  wishlistCodes: string[];
  isLoggedIn: boolean;
  currentUsername: string | null;
  followState: ProfileFollowState | null;
  canFollow: boolean;
};

async function loadWishlistCountries(
  supabase: SupabaseClient,
  profile: PublicProfile,
  isOwnProfile: boolean
): Promise<WishlistCountry[]> {
  if (!isOwnProfile && !profile.wishlist_public) return [];

  const { data, error } = await supabase
    .from("wishlist_countries")
    .select("*")
    .eq("user_id", profile.id)
    .order("country_name", { ascending: true });

  if (error) return [];
  return (data ?? []) as WishlistCountry[];
}

async function loadProfileRows(
  supabase: SupabaseClient,
  profile: PublicProfile
): Promise<
  Pick<PublicProfilePageData, "visitedCountries" | "visitedCities" | "visitedParks">
> {
  const [{ data: countries }, { data: cities }, { data: parks }] = await Promise.all([
    supabase
      .from("visited_countries")
      .select("*")
      .eq("user_id", profile.id)
      .order("country_name", { ascending: true }),
    supabase
      .from("visited_cities")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("visited_parks")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    visitedCountries: (countries ?? []) as VisitedCountry[],
    visitedCities: (cities ?? []) as VisitedCity[],
    visitedParks: (parks ?? []) as VisitedPark[],
  };
}

/** Single cached loader for profile metadata + page (avoids duplicate Supabase round-trips). */
export const loadPublicProfilePage = cache(
  async (username: string): Promise<PublicProfilePageData | null> => {
    const supabase = await createClient();
    if (!supabase) return null;

    const profile = await fetchPublicProfile(supabase, username);
    if (!profile) return null;

    const authUser = await getAuthUser();
    let currentUsername: string | null = null;
    if (authUser) {
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", authUser.id)
        .maybeSingle();
      currentUsername = currentProfile?.username ?? null;
    }

    const isOwnProfile =
      currentUsername != null &&
      currentUsername.toLowerCase() === profile.username.toLowerCase();

    const [{ visitedCountries, visitedCities, visitedParks }, wishlistCountries] =
      await Promise.all([
        loadProfileRows(supabase, profile),
        loadWishlistCountries(supabase, profile, isOwnProfile),
      ]);

    const stats = computeTravelStats(visitedCountries, visitedCities, visitedParks);
    const visitedCodes = getVisitedCountryCodes(
      visitedCountries,
      visitedCities,
      visitedParks
    );
    const wishlistCodes =
      isOwnProfile || profile.wishlist_public
        ? getWishlistCountryCodes(wishlistCountries)
        : [];

    const followState = await loadProfileFollowState(
      supabase,
      profile.id,
      authUser?.id ?? null
    );
    const canFollow =
      Boolean(authUser) &&
      !isOwnProfile &&
      !isDemoProfileUsername(profile.username);

    return {
      profile,
      visitedCountries,
      visitedCities,
      visitedParks,
      wishlistCountries,
      stats,
      visitedCodes,
      wishlistCodes,
      isLoggedIn: !!authUser,
      currentUsername,
      followState,
      canFollow,
    };
  }
);
