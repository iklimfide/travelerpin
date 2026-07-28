import type { PublicProfile } from "@/lib/supabase/public-profile";
import { getWishlistCountryCodes } from "@/lib/utils/stats";
import {
  mergeVisitedCitiesById,
  mergeVisitedParksById,
} from "@/lib/utils/merge-profile-travel-pins";
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

/** Shown while profile stats load on first paint — replaced when real data arrives. */
export const PROFILE_STATS_LOADING_PLACEHOLDER: TravelStats = {
  countries: 28,
  cities: 84,
  nationalParks: 9,
  themeParks: 11,
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
    visitedCities: mergeVisitedCitiesById(data.visitedCities, travel.visitedCities),
    visitedParks: mergeVisitedParksById(data.visitedParks, travel.visitedParks),
    wishlistCountries: travel.wishlistCountries,
    wishlistCodes: getWishlistCountryCodes(travel.wishlistCountries),
    visitedCodes: travel.visitedCodes,
    stats: travel.stats,
  };
}
