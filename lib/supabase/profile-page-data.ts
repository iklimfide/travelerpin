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
import {
  type PublicProfilePageData,
  type PublicProfileShellData,
} from "@/lib/supabase/profile-page-types";
import { getAuthUser } from "@/lib/supabase/auth";

export type { PublicProfilePageData, PublicProfileShellData } from "@/lib/supabase/profile-page-types";
export {
  EMPTY_TRAVEL_STATS,
  createEmptyProfilePageData,
} from "@/lib/supabase/profile-page-types";
import { profileCacheTag } from "@/lib/cache/revalidate-profile";
import { isDemoProfileUsername } from "@/lib/data/showcase-profile";
import { DEMO_PROFILE } from "@/lib/data/demo-page-static";
import { loadJenniferDemoTravelRows } from "@/lib/data/jennifer-demo-travel";
import {
  loadDemoPublicProfilePage,
} from "@/lib/data/jennifer-demo-page";
import { loadProfileFollowState } from "@/lib/supabase/profile-follows";
import { parseNextRoute } from "@/lib/utils/next-route";
import { isPlausibleProfileUsername } from "@/lib/utils/username";
import { dedupeVisitedCitiesForDisplay } from "@/lib/utils/visited-city-normalize";
import type {
  ProfileFollowState,
  TravelStats,
  VisitedCity,
  VisitedCountry,
  VisitedPark,
  WishlistCountry,
} from "@/types/database";

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
  if (!isPlausibleProfileUsername(key)) return Promise.resolve(null);

  if (isDemoProfileUsername(key)) {
    return unstable_cache(
      async () => {
        const travel = await loadJenniferDemoTravelRows();
        return {
          profile: DEMO_PROFILE,
          visitedCountries: travel.visitedCountries,
          visitedCities: travel.visitedCities,
          visitedParks: travel.visitedParks,
          publicWishlistCountries: travel.wishlistCountries,
        };
      },
      ["jennifer-demo-public-bundle-v6"],
      { revalidate: 300 }
    )();
  }

  return unstable_cache(
    async () => {
      const supabase = createPublicSupabaseClient();
      if (!supabase) {
        // Do not cache infra misses as "profile not found".
        throw new Error("getCachedPublicProfileBundle: Supabase not configured");
      }

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
    ["public-profile-bundle-v5", key],
    // Indefinite until pin/profile write calls revalidateProfileForPin.
    { revalidate: false, tags: [profileCacheTag(key)] }
  )();
}

/** Cached public profile + stats for OG metadata (no auth round-trip). */
export const loadPublicProfileMetadata = cache(
  async (username: string): Promise<{ profile: PublicProfile; stats: TravelStats } | null> => {
    if (!isPlausibleProfileUsername(username)) return null;

    const demo = await loadDemoPublicProfilePage(username);
    if (demo) {
      return { profile: demo.profile, stats: demo.stats };
    }

    const bundle = await getCachedPublicProfileBundle(username);
    if (!bundle) return null;

    let profile = bundle.profile;
    const freshPresentation = await fetchFreshProfilePresentation(profile.id);
    if (freshPresentation) {
      profile = { ...profile, ...freshPresentation };
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
);

/**
 * Fast profile shell for first paint — presentation fields only, no pin bundle.
 * Full travel data is loaded client-side via `/api/profile/[username]/page-data`.
 */
export const loadPublicProfileShell = cache(
  async (username: string): Promise<PublicProfileShellData | null> => {
    if (!isPlausibleProfileUsername(username)) return null;

    const demo = await loadDemoPublicProfilePage(username);
    if (demo) {
      return {
        profile: demo.profile,
        isLoggedIn: demo.isLoggedIn,
        currentUsername: demo.currentUsername,
      };
    }

    const publicSupabase = createPublicSupabaseClient();
    if (!publicSupabase) return null;

    const [profileRow, authUser] = await Promise.all([
      fetchPublicProfile(publicSupabase, username),
      getAuthUser(),
    ]);
    if (!profileRow) return null;

    let profile = {
      ...profileRow,
      next_route: parseNextRoute(profileRow.next_route),
    };
    const freshPresentation = await fetchFreshProfilePresentation(profile.id);
    if (freshPresentation) {
      profile = {
        ...profile,
        ...freshPresentation,
        next_route: freshPresentation.next_route ?? profile.next_route,
      };
    }

    let currentUsername: string | null = null;
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
        }
      } catch (error) {
        console.error("loadPublicProfileShell auth lookup failed:", error);
      }
    }

    return {
      profile,
      isLoggedIn: !!authUser,
      currentUsername,
    };
  }
);

/**
 * Public profile page loader. @jennifer uses hybrid demo + guvencgiller pins.
 */
export const loadPublicProfilePage = cache(
  async (username: string): Promise<PublicProfilePageData | null> => {
    if (!isPlausibleProfileUsername(username)) return null;

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

    const freshPresentation = await fetchFreshProfilePresentation(profile.id);
    if (freshPresentation) {
      profile = {
        ...profile,
        ...freshPresentation,
        next_route: freshPresentation.next_route ?? profile.next_route,
      };

      if (
        freshPresentation.wishlist_public &&
        !bundle.profile.wishlist_public &&
        wishlistCountries.length === 0 &&
        publicSupabase
      ) {
        wishlistCountries = await loadWishlistCountries(publicSupabase, profile, false);
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

          // Wishlist for the owner must not wait on the public profile cache.
          if (isOwnProfile) {
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
