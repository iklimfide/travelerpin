import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import {
  fetchPublicProfile,
  fetchFreshProfilePresentation,
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
import { profileCacheTag } from "@/lib/cache/revalidate-profile";
import {
  DEMO_PUBLIC_PROFILE_BUNDLE,
  isDemoProfileUsername,
  loadDemoPublicProfilePage,
} from "@/lib/data/jennifer-demo-page";
import { loadProfileFollowState } from "@/lib/supabase/profile-follows";
import { parseNextRoute } from "@/lib/utils/next-route";
import { dedupeVisitedCitiesForDisplay } from "@/lib/utils/visited-city-normalize";

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
    visitedCities: dedupeVisitedCitiesForDisplay((cities ?? []) as VisitedCity[]),
    visitedParks: (parks ?? []) as VisitedPark[],
  };
}

/** Shared across viewers / OG generation — profile pins are public. */
export function getCachedPublicProfileBundle(
  username: string
): Promise<PublicProfileBundle | null> {
  const key = username.trim().toLowerCase();

  // Sample profile is code-only — never touch Supabase for @jennifer.
  if (isDemoProfileUsername(key)) {
    return Promise.resolve(DEMO_PUBLIC_PROFILE_BUNDLE);
  }

  return unstable_cache(
    async () => {
      try {
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
      } catch (error) {
        console.error("getCachedPublicProfileBundle failed:", error);
        return null;
      }
    },
    ["public-profile-bundle-v4", key],
    // Indefinite until pin/profile write calls revalidateProfileForPin.
    { revalidate: false, tags: [profileCacheTag(key)] }
  )();
}

/** Cached public profile + stats for OG metadata (no auth round-trip). */
export async function loadPublicProfileMetadata(
  username: string
): Promise<{ profile: PublicProfile; stats: TravelStats } | null> {
  const demo = await loadDemoPublicProfilePage(username);
  if (demo) {
    return { profile: demo.profile, stats: demo.stats };
  }

  const bundle = await getCachedPublicProfileBundle(username);
  if (!bundle) return null;

  let profile = bundle.profile;
  const publicSupabase = createPublicSupabaseClient();
  if (publicSupabase) {
    const freshPresentation = await fetchFreshProfilePresentation(publicSupabase, profile.id);
    if (freshPresentation) {
      profile = { ...profile, ...freshPresentation };
    }
  }

  return {
    profile,
    stats: computeTravelStats(
      bundle.visitedCountries,
      bundle.visitedCities,
      bundle.visitedParks
    ),
  };
}

/**
 * Public profile page loader. Demo username always uses in-memory sample data.
 * Real profiles use the cached Supabase bundle.
 */
export const loadPublicProfilePage = cache(
  async (username: string): Promise<PublicProfilePageData | null> => {
    const demo = await loadDemoPublicProfilePage(username);
    if (demo) return demo;

    const [bundle, authUser] = await Promise.all([
      getCachedPublicProfileBundle(username),
      getAuthUser(),
    ]);
    if (!bundle) return null;

    const publicSupabase = createPublicSupabaseClient();
    let profile = {
      ...bundle.profile,
      next_route: parseNextRoute(bundle.profile.next_route),
    };
    let { visitedCountries, visitedCities, visitedParks } = bundle;
    let wishlistCountries = bundle.publicWishlistCountries;

    if (publicSupabase) {
      const freshPresentation = await fetchFreshProfilePresentation(publicSupabase, profile.id);
      if (freshPresentation) {
        profile = {
          ...profile,
          ...freshPresentation,
          next_route: freshPresentation.next_route ?? profile.next_route,
        };

        if (
          freshPresentation.wishlist_public &&
          !bundle.profile.wishlist_public &&
          wishlistCountries.length === 0
        ) {
          wishlistCountries = await loadWishlistCountries(publicSupabase, profile, false);
        }
      }
    }

    let currentUsername: string | null = null;
    let followState: ProfileFollowState | null = null;
    let isOwnProfile = false;

    if (authUser) {
      try {
        const supabase = await createClient();
        if (supabase) {
          const { data: currentProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", authUser.id)
            .maybeSingle();
          currentUsername = currentProfile?.username ?? null;
          isOwnProfile =
            currentUsername != null &&
            currentUsername.toLowerCase() === profile.username.toLowerCase();

          // Private wishlist is owner-only and not in the public pin cache.
          if (isOwnProfile && !profile.wishlist_public) {
            wishlistCountries = await loadWishlistCountries(supabase, profile, true);
          }

          // Follow state stays live — not part of the long-lived pin cache.
          followState = await loadProfileFollowState(
            supabase,
            profile.id,
            authUser.id
          );

          if (isOwnProfile) {
            // Owner pin edits must not wait on indefinite public cache / revalidateTag lag.
            const freshPins = await loadProfileRows(supabase, profile);
            visitedCountries = freshPins.visitedCountries;
            visitedCities = freshPins.visitedCities;
            visitedParks = freshPins.visitedParks;

            const { data: routeRow, error: routeError } = await supabase
              .from("profiles")
              .select("next_route")
              .eq("id", profile.id)
              .maybeSingle();

            if (!routeError && routeRow) {
              profile = {
                ...profile,
                next_route: parseNextRoute(routeRow.next_route),
              };
            }
          }
        }
      } catch (error) {
        console.error("loadPublicProfilePage auth enrichment failed:", error);
      }
    }

    // Residence auto-pin runs client-side once per session via OwnProfileShellGate
    // (POST /api/profile/ensure-residence) — keep SSR read-only.

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
