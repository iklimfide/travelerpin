import type { PublicProfile } from "@/lib/supabase/public-profile";
import type {
  ProfileFollowState,
  TravelStats,
  VisitedCity,
  VisitedCountry,
  VisitedPark,
  WishlistCountry,
} from "@/types/database";

export const EMPTY_TRAVEL_STATS: TravelStats = {
  countries: 0,
  cities: 0,
  nationalParks: 0,
  themeParks: 0,
};

export type PublicProfileShellData = {
  profile: PublicProfile;
  isLoggedIn: boolean;
  currentUsername: string | null;
};

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

export function createEmptyProfilePageData(
  shell: PublicProfileShellData
): PublicProfilePageData {
  return {
    profile: shell.profile,
    visitedCountries: [],
    visitedCities: [],
    visitedParks: [],
    wishlistCountries: [],
    stats: EMPTY_TRAVEL_STATS,
    visitedCodes: [],
    wishlistCodes: [],
    isLoggedIn: shell.isLoggedIn,
    currentUsername: shell.currentUsername,
    followState: null,
    canFollow: false,
  };
}

export function mergeTravelStateIntoProfilePageData(
  data: PublicProfilePageData,
  travel: {
    visitedCountries: PublicProfilePageData["visitedCountries"];
    visitedCities: PublicProfilePageData["visitedCities"];
    visitedParks: PublicProfilePageData["visitedParks"];
    wishlistCountries: PublicProfilePageData["wishlistCountries"];
    visitedCodes: PublicProfilePageData["visitedCodes"];
    stats: PublicProfilePageData["stats"];
  }
): PublicProfilePageData {
  return {
    ...data,
    visitedCountries: travel.visitedCountries,
    visitedCities: travel.visitedCities,
    visitedParks: travel.visitedParks,
    wishlistCountries: travel.wishlistCountries,
    visitedCodes: travel.visitedCodes,
    stats: travel.stats,
  };
}
