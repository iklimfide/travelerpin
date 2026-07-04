import { DEMO_CITIES } from "@/lib/data/demo-cities";
import { DEMO_VISITED_COUNTRIES } from "@/lib/data/demo-countries";
import { DEMO_PARKS } from "@/lib/data/demo-parks";
import { DEMO_PERSONA, getDemoTravelStats } from "@/lib/data/demo-persona";
import { DEMO_WISHLIST_COUNTRIES } from "@/lib/data/demo-wishlist";
import { getAuthUser } from "@/lib/supabase/auth";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";
import type { PublicProfile } from "@/lib/supabase/public-profile";
import {
  normalizeCityKey,
  resolveResidenceCityPinInput,
} from "@/lib/utils/residence-city";
import {
  getVisitedCountryCodes,
  getWishlistCountryCodes,
} from "@/lib/utils/stats";
import type { VisitedCity } from "@/types/database";

/** Fully static showcase profile — never loaded from the database. */
export const DEMO_PROFILE: PublicProfile = {
  id: "demo-jennifer",
  username: DEMO_PERSONA.username,
  display_name: DEMO_PERSONA.name,
  avatar_url: DEMO_PERSONA.avatarUrl,
  cover_url: null,
  bio: DEMO_PERSONA.bio,
  residence: DEMO_PERSONA.residence,
  instagram_url: DEMO_PERSONA.instagramUrl,
  profession: null,
  marital_status: null,
  wishlist_public: true,
};

/** Fallback if tourist-city resolve fails — Jennifer always lives in LA. */
const JENNIFER_HOME_CITY: VisitedCity = {
  id: "demo-residence-home",
  user_id: "demo",
  city_name: "Los Angeles",
  country_code: "US",
  country_name: "United States",
  latitude: 34.0689,
  longitude: -118.2516,
  note: "Home base — pinned as where Jennifer lives.",
  media_type: null,
  media_url: null,
  photo_url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/demo/jennifer-los-angeles.jpg",
  instagram_urls: ["https://www.instagram.com/p/CuK0zZ9t8rK/"],
  media_preview_url: null,
  visit_dates: ["2025-05"],
  created_at: "2025-05-18T12:00:00.000Z",
  updated_at: "2025-05-18T12:00:00.000Z",
};

/**
 * Same rule as real users: residence is a city pin.
 * Resolve home city and ensure it is first on the map.
 */
function demoCitiesWithResidencePin(): VisitedCity[] {
  const residencePin = resolveResidenceCityPinInput(DEMO_PERSONA.residence);
  const homeCityName = residencePin?.city_name ?? JENNIFER_HOME_CITY.city_name;
  const homeCountryCode = (
    residencePin?.country_code ?? JENNIFER_HOME_CITY.country_code
  ).toUpperCase();
  const nameKey = normalizeCityKey(homeCityName);

  const existing = DEMO_CITIES.find(
    (city) =>
      city.country_code.toUpperCase() === homeCountryCode &&
      normalizeCityKey(city.city_name) === nameKey
  );
  const others = DEMO_CITIES.filter(
    (city) =>
      !(
        city.country_code.toUpperCase() === homeCountryCode &&
        normalizeCityKey(city.city_name) === nameKey
      )
  );

  const homeCity: VisitedCity = {
    ...JENNIFER_HOME_CITY,
    ...(existing ?? {}),
    id: existing?.id ?? JENNIFER_HOME_CITY.id,
    city_name: residencePin?.city_name ?? existing?.city_name ?? JENNIFER_HOME_CITY.city_name,
    country_code:
      residencePin?.country_code ?? existing?.country_code ?? JENNIFER_HOME_CITY.country_code,
    country_name:
      residencePin?.country_name ?? existing?.country_name ?? JENNIFER_HOME_CITY.country_name,
    latitude: residencePin?.latitude ?? existing?.latitude ?? JENNIFER_HOME_CITY.latitude,
    longitude: residencePin?.longitude ?? existing?.longitude ?? JENNIFER_HOME_CITY.longitude,
    note:
      existing?.note ??
      JENNIFER_HOME_CITY.note,
    photo_url: existing?.photo_url ?? JENNIFER_HOME_CITY.photo_url,
    instagram_urls: existing?.instagram_urls?.length
      ? existing.instagram_urls
      : JENNIFER_HOME_CITY.instagram_urls,
  };

  return [homeCity, ...others];
}

const DEMO_VISITED_CITIES = demoCitiesWithResidencePin();

/** Showcase cities for hub pages (e.g. /city/los-angeles). */
export function getDemoVisitedCities(): VisitedCity[] {
  return DEMO_VISITED_CITIES;
}

/** Showcase parks for hub pages. */
export function getDemoVisitedParks() {
  return DEMO_PARKS;
}

const DEMO_PAGE_ROWS = {
  visitedCountries: DEMO_VISITED_COUNTRIES,
  visitedCities: DEMO_VISITED_CITIES,
  visitedParks: DEMO_PARKS,
  wishlistCountries: DEMO_WISHLIST_COUNTRIES,
  stats: getDemoTravelStats(),
  visitedCodes: getVisitedCountryCodes(
    DEMO_VISITED_COUNTRIES,
    DEMO_VISITED_CITIES,
    DEMO_PARKS
  ),
  wishlistCodes: getWishlistCountryCodes(DEMO_WISHLIST_COUNTRIES),
};

/** Pin/profile bundle for OG and public loaders — in-memory only. */
export const DEMO_PUBLIC_PROFILE_BUNDLE = {
  profile: DEMO_PROFILE,
  visitedCountries: DEMO_PAGE_ROWS.visitedCountries,
  visitedCities: DEMO_PAGE_ROWS.visitedCities,
  visitedParks: DEMO_PAGE_ROWS.visitedParks,
  publicWishlistCountries: DEMO_PAGE_ROWS.wishlistCountries,
};

const DEMO_FOLLOW_STATE = {
  isFollowing: false,
  followerCount: 128,
  followingCount: 42,
} as const;

export function isDemoProfileUsername(username: string): boolean {
  return username.trim().toLowerCase() === DEMO_PERSONA.username;
}

/**
 * Static showcase profile for @jennifer.
 * Pin/map data is code-only; never hits Supabase for Jennifer.
 * Only reads the viewer session so guest vs signed-in chrome is correct.
 */
export async function loadDemoPublicProfilePage(
  username: string
): Promise<PublicProfilePageData | null> {
  if (!isDemoProfileUsername(username)) return null;

  const authUser = await getAuthUser();

  return {
    profile: DEMO_PROFILE,
    visitedCountries: DEMO_PAGE_ROWS.visitedCountries,
    visitedCities: DEMO_PAGE_ROWS.visitedCities,
    visitedParks: DEMO_PAGE_ROWS.visitedParks,
    wishlistCountries: DEMO_PAGE_ROWS.wishlistCountries,
    stats: DEMO_PAGE_ROWS.stats,
    visitedCodes: DEMO_PAGE_ROWS.visitedCodes,
    wishlistCodes: DEMO_PAGE_ROWS.wishlistCodes,
    isLoggedIn: !!authUser,
    // Sample profile is never "owned" — even if a DB user claims the username.
    currentUsername: null,
    followState: { ...DEMO_FOLLOW_STATE },
    canFollow: false,
  };
}

/** @deprecated Use loadDemoPublicProfilePage */
export function loadJenniferDemoPage() {
  return {
    profile: { ...DEMO_PROFILE, created_at: "" },
    ...DEMO_PAGE_ROWS,
  };
}

export type JenniferDemoPageData = ReturnType<typeof loadJenniferDemoPage>;
