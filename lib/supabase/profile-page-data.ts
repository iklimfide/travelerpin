import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
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

type PublicProfileBundle = {
  profile: PublicProfile;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  publicWishlistCountries: WishlistCountry[];
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

/** Shared across viewers / OG generation — profile pins are public. */
export function getCachedPublicProfileBundle(
  username: string
): Promise<PublicProfileBundle | null> {
  const key = username.trim().toLowerCase();

  return unstable_cache(
    async () => {
      const supabase = createPublicSupabaseClient();
      if (!supabase) return null;

      const profile = await fetchPublicProfile(supabase, key);
      if (!profile) return null;

      const rows = await loadProfileRows(supabase, profile);
      const publicWishlistCountries = await loadWishlistCountries(
        supabase,
        profile,
        false
      );

      return {
        profile,
        ...rows,
        publicWishlistCountries,
      };
    },
    ["public-profile-bundle", key],
    { revalidate: 60, tags: [`profile:${key}`] }
  )();
}

/** Single cached loader for profile metadata + page (avoids duplicate Supabase round-trips). */
export const loadPublicProfilePage = cache(
  async (username: string): Promise<PublicProfilePageData | null> => {
    const [bundle, authUser] = await Promise.all([
      getCachedPublicProfileBundle(username),
      getAuthUser(),
    ]);
    if (!bundle) return null;

    const { profile } = bundle;
    let { visitedCountries, visitedCities, visitedParks } = bundle;
    let wishlistCountries = bundle.publicWishlistCountries;
    let currentUsername: string | null = null;
    let followState: ProfileFollowState | null = null;
    let isOwnProfile = false;

    if (authUser) {
      const supabase = await createClient();
      if (!supabase) return null;

      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", authUser.id)
        .maybeSingle();
      currentUsername = currentProfile?.username ?? null;
      isOwnProfile =
        currentUsername != null &&
        currentUsername.toLowerCase() === profile.username.toLowerCase();

      if (isOwnProfile) {
        // Owners always see live pins (cache is for public/crawler traffic).
        const rows = await loadProfileRows(supabase, profile);
        visitedCountries = rows.visitedCountries;
        visitedCities = rows.visitedCities;
        visitedParks = rows.visitedParks;
        wishlistCountries = await loadWishlistCountries(supabase, profile, true);
      }

      followState = await loadProfileFollowState(
        supabase,
        profile.id,
        authUser.id
      );
    }

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
