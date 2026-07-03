import { DEMO_CITIES } from "@/lib/data/demo-cities";
import { DEMO_VISITED_COUNTRIES } from "@/lib/data/demo-countries";
import { DEMO_PERSONA, getDemoTravelStats } from "@/lib/data/demo-persona";
import { DEMO_WISHLIST_COUNTRIES } from "@/lib/data/demo-wishlist";
import { getAuthUser } from "@/lib/supabase/auth";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";
import { createClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/lib/supabase/public-profile";
import {
  getVisitedCountryCodes,
  getWishlistCountryCodes,
} from "@/lib/utils/stats";
import type { VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";

const DEMO_PROFILE: PublicProfile = {
  id: "demo-jennifer",
  username: DEMO_PERSONA.username,
  display_name: DEMO_PERSONA.name,
  avatar_url: DEMO_PERSONA.avatarUrl,
  cover_url: null,
  bio: DEMO_PERSONA.bio,
  residence: DEMO_PERSONA.residence,
  instagram_url: null,
  profession: null,
  marital_status: null,
  wishlist_public: true,
};

function buildDemoPageRows(): Pick<
  PublicProfilePageData,
  | "visitedCountries"
  | "visitedCities"
  | "visitedParks"
  | "wishlistCountries"
  | "stats"
  | "visitedCodes"
  | "wishlistCodes"
> {
  const visitedCountries = DEMO_VISITED_COUNTRIES;
  const visitedCities = DEMO_CITIES;
  const visitedParks: VisitedPark[] = [];
  const wishlistCountries = DEMO_WISHLIST_COUNTRIES;
  const stats = getDemoTravelStats();

  return {
    visitedCountries,
    visitedCities,
    visitedParks,
    wishlistCountries,
    stats,
    visitedCodes: getVisitedCountryCodes(visitedCountries, visitedCities, visitedParks),
    wishlistCodes: getWishlistCountryCodes(wishlistCountries),
  };
}

export function isDemoProfileUsername(username: string): boolean {
  return username.toLowerCase() === DEMO_PERSONA.username;
}

/** Static showcase profile used when no DB user exists for @jennifer. */
export async function loadDemoPublicProfilePage(
  username: string
): Promise<PublicProfilePageData | null> {
  if (!isDemoProfileUsername(username)) return null;

  const authUser = await getAuthUser();
  let currentUsername: string | null = null;

  if (authUser) {
    const supabase = await createClient();
    if (supabase) {
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", authUser.id)
        .maybeSingle();
      currentUsername = currentProfile?.username ?? null;
    }
  }

  return {
    profile: DEMO_PROFILE,
    ...buildDemoPageRows(),
    isLoggedIn: !!authUser,
    currentUsername,
    followState: { isFollowing: false, followerCount: 128, followingCount: 42 },
    canFollow: false,
  };
}

/** @deprecated Use loadDemoPublicProfilePage */
export function loadJenniferDemoPage() {
  return {
    profile: { ...DEMO_PROFILE, created_at: "" },
    ...buildDemoPageRows(),
  };
}

export type JenniferDemoPageData = ReturnType<typeof loadJenniferDemoPage>;
