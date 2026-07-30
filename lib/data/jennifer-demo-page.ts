import { getAuthUser } from "@/lib/supabase/auth";
import {
  DEMO_PROFILE,
  buildStaticDemoPublicProfilePage,
  getDemoVisitedCities,
  getDemoVisitedParks,
  loadJenniferDemoPageStatic,
  type JenniferDemoPageData,
} from "@/lib/data/demo-page-static";
import { isDemoProfileUsername } from "@/lib/data/showcase-profile";
import { loadJenniferDemoTravelRows } from "@/lib/data/jennifer-demo-travel";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";

export {
  DEMO_PROFILE,
  getDemoVisitedCities,
  getDemoVisitedParks,
  buildStaticDemoPublicProfilePage,
} from "@/lib/data/demo-page-static";

export { isDemoProfileUsername, isShowcaseProfileUsername } from "@/lib/data/showcase-profile";

export async function loadDemoPublicProfilePage(
  username: string
): Promise<PublicProfilePageData | null> {
  if (!isDemoProfileUsername(username)) return null;

  const authUser = await getAuthUser();
  const travel = await loadJenniferDemoTravelRows();

  return {
    profile: {
      ...DEMO_PROFILE,
      instagram_url:
        travel.showcaseInstagramUrl?.trim() || DEMO_PROFILE.instagram_url,
    },
    visitedCountries: travel.visitedCountries,
    visitedCities: travel.visitedCities,
    visitedParks: travel.visitedParks,
    wishlistCountries: travel.wishlistCountries,
    stats: travel.stats,
    visitedCodes: travel.visitedCodes,
    wishlistCodes: travel.wishlistCodes,
    isLoggedIn: !!authUser,
    currentUsername: null,
    followState: {
      isFollowing: false,
      followerCount: 128,
      followingCount: 42,
    },
    canFollow: false,
  };
}

/** @deprecated Use loadDemoPublicProfilePage */
export function loadJenniferDemoPage(): JenniferDemoPageData {
  return loadJenniferDemoPageStatic();
}

export type { JenniferDemoPageData };
