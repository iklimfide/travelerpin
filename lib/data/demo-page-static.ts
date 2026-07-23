import { DEMO_CITIES } from "@/lib/data/demo-cities";
import { DEMO_VISITED_COUNTRIES } from "@/lib/data/demo-countries";
import { DEMO_NEXT_ROUTE_STOPS, DEMO_NEXT_ROUTE_TOTAL_DAYS, DEMO_NEXT_ROUTE_TRANSPORT } from "@/lib/data/demo-next-route";
import { DEMO_PARKS } from "@/lib/data/demo-parks";
import { DEMO_PERSONA, getDemoTravelStats } from "@/lib/data/demo-persona";
import { DEMO_WISHLIST_COUNTRIES } from "@/lib/data/demo-wishlist";
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
  locale: "en",
  next_route: DEMO_NEXT_ROUTE_STOPS,
  next_route_total_days: DEMO_NEXT_ROUTE_TOTAL_DAYS,
  next_route_transport: DEMO_NEXT_ROUTE_TRANSPORT,
};

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
    note: existing?.note ?? JENNIFER_HOME_CITY.note,
    photo_url: existing?.photo_url ?? JENNIFER_HOME_CITY.photo_url,
    instagram_urls: existing?.instagram_urls?.length
      ? existing.instagram_urls
      : JENNIFER_HOME_CITY.instagram_urls,
  };

  return [homeCity, ...others];
}

const DEMO_VISITED_CITIES = demoCitiesWithResidencePin();

export function getDemoVisitedCities(): VisitedCity[] {
  return DEMO_VISITED_CITIES;
}

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

/** Client-safe static demo profile — no auth or server imports. */
export function buildStaticDemoPublicProfilePage(options?: {
  isLoggedIn?: boolean;
}): PublicProfilePageData {
  return {
    profile: DEMO_PROFILE,
    visitedCountries: DEMO_PAGE_ROWS.visitedCountries,
    visitedCities: DEMO_PAGE_ROWS.visitedCities,
    visitedParks: DEMO_PAGE_ROWS.visitedParks,
    wishlistCountries: DEMO_PAGE_ROWS.wishlistCountries,
    stats: DEMO_PAGE_ROWS.stats,
    visitedCodes: DEMO_PAGE_ROWS.visitedCodes,
    wishlistCodes: DEMO_PAGE_ROWS.wishlistCodes,
    isLoggedIn: options?.isLoggedIn ?? false,
    currentUsername: null,
    followState: { ...DEMO_FOLLOW_STATE },
    canFollow: false,
  };
}

export function loadJenniferDemoPageStatic() {
  return {
    profile: { ...DEMO_PROFILE, created_at: "" },
    ...DEMO_PAGE_ROWS,
  };
}

export type JenniferDemoPageData = ReturnType<typeof loadJenniferDemoPageStatic>;
