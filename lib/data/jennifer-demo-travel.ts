import { unstable_cache } from "next/cache";
import {
  DEMO_MAP_SHOWCASE_COUNTRIES,
  DEMO_MAP_SHOWCASE_COUNTRY_CODES,
  isJenniferShowcaseCountryCode,
} from "@/lib/data/demo-countries";
import { getDemoVisitedCities, getDemoVisitedParks } from "@/lib/data/demo-page-static";
import { DEMO_WISHLIST_COUNTRIES } from "@/lib/data/demo-wishlist";
import { SHOWCASE_PROFILE_USERNAME } from "@/lib/data/showcase-profile";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { fetchPublicProfile } from "@/lib/supabase/public-profile";
import type { TravelStats, VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";
import { computeTravelStats, getWishlistCountryCodes } from "@/lib/utils/stats";
import { withUkMapCountryCodes } from "@/lib/data/uk-nations";
import { getCountryName } from "@/lib/data/countries";
import { normalizeJenniferDemoCountryCode } from "@/lib/data/jennifer-demo-display";
import { stripJenniferDemoPinUserPhotos } from "@/lib/data/jennifer-demo-media";
import { dedupeVisitedCitiesForDisplay } from "@/lib/utils/visited-city-normalize";

import { JENNIFER_MARKETING_STATS } from "@/lib/data/jennifer-marketing-stats";

/** Homepage / Jennifer identity counters (marketing). */
export const JENNIFER_DISPLAY_STATS = {
  countries: JENNIFER_MARKETING_STATS.countries,
  cities: JENNIFER_MARKETING_STATS.cities,
} as const;

const DEMO_USER_ID = "demo";

type GuvencTravelPins = {
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  wishlistCountries: WishlistCountry[];
};

const getCachedGuvencTravelPins = unstable_cache(
  async (): Promise<GuvencTravelPins | null> => {
    const supabase = createPublicSupabaseClient();
    if (!supabase) return null;

    const profile = await fetchPublicProfile(supabase, SHOWCASE_PROFILE_USERNAME);
    if (!profile) return null;

    const [{ data: cities }, { data: parks }, wishlistResult] = await Promise.all([
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
      profile.wishlist_public
        ? supabase
            .from("wishlist_countries")
            .select("*")
            .eq("user_id", profile.id)
            .order("country_name", { ascending: true })
        : Promise.resolve({ data: [] as WishlistCountry[], error: null }),
    ]);

    return {
      visitedCities: dedupeVisitedCitiesForDisplay((cities ?? []) as VisitedCity[]),
      visitedParks: (parks ?? []) as VisitedPark[],
      wishlistCountries: (wishlistResult.data ?? []) as WishlistCountry[],
    };
  },
  ["jennifer-demo-guvenc-pins-v4"],
  { revalidate: 300 }
);

function cityPinSortTime(city: VisitedCity): number {
  const raw = city.updated_at || city.created_at;
  const time = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(time) ? time : 0;
}

function pickGuvencCitiesForJennifer(cities: VisitedCity[]): VisitedCity[] {
  const normalized = dedupeVisitedCitiesForDisplay(cities).map((city) => {
    const country_code = normalizeJenniferDemoCountryCode(city.country_code);
    return {
      ...city,
      country_code,
      country_name: getCountryName(country_code, "en") ?? city.country_name,
    };
  });
  const filtered = normalized.filter((city) => isJenniferShowcaseCountryCode(city.country_code));
  const sorted = [...filtered].sort((a, b) => cityPinSortTime(b) - cityPinSortTime(a));
  return sorted.slice(0, JENNIFER_DISPLAY_STATS.cities).map((city) =>
    stripJenniferDemoPinUserPhotos({
      ...city,
      user_id: DEMO_USER_ID,
    })
  );
}

function pickGuvencParksForJennifer(parks: VisitedPark[]): VisitedPark[] {
  return parks
    .map((park) => {
      const country_code = normalizeJenniferDemoCountryCode(park.country_code);
      return {
        ...park,
        country_code,
        country_name: getCountryName(country_code, "en") ?? park.country_name,
      };
    })
    .filter((park) => isJenniferShowcaseCountryCode(park.country_code))
    .map((park) =>
      stripJenniferDemoPinUserPhotos({
        ...park,
        user_id: DEMO_USER_ID,
      })
    );
}

function jenniferShowcaseVisitedCodes(): string[] {
  return withUkMapCountryCodes(new Set(DEMO_MAP_SHOWCASE_COUNTRY_CODES));
}

export type JenniferDemoTravelRows = {
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  wishlistCountries: WishlistCountry[];
  stats: TravelStats;
  visitedCodes: string[];
  wishlistCodes: string[];
};

function buildJenniferStats(visitedCities: VisitedCity[], parks: VisitedPark[]): TravelStats {
  const parkStats = computeTravelStats([], [], parks);
  return {
    countries: JENNIFER_DISPLAY_STATS.countries,
    cities: Math.min(visitedCities.length, JENNIFER_DISPLAY_STATS.cities),
    nationalParks: parkStats.nationalParks,
    themeParks: parkStats.themeParks,
  };
}

function buildStaticFallbackRows(): JenniferDemoTravelRows {
  const visitedCountries = DEMO_MAP_SHOWCASE_COUNTRIES;
  const visitedCities = getDemoVisitedCities()
    .filter((city) => isJenniferShowcaseCountryCode(city.country_code))
    .map(stripJenniferDemoPinUserPhotos);
  const visitedParks = getDemoVisitedParks()
    .filter((park) => isJenniferShowcaseCountryCode(park.country_code))
    .map(stripJenniferDemoPinUserPhotos);
  const wishlistCountries = DEMO_WISHLIST_COUNTRIES;
  const stats = buildJenniferStats(visitedCities, visitedParks);

  return {
    visitedCountries,
    visitedCities,
    visitedParks,
    wishlistCountries,
    stats,
    visitedCodes: jenniferShowcaseVisitedCodes(),
    wishlistCodes: getWishlistCountryCodes(wishlistCountries),
  };
}

/** Jennifer map + trips use @guvencgiller pins; identity counters stay 41 / 124. */
export async function loadJenniferDemoTravelRows(): Promise<JenniferDemoTravelRows> {
  const guvenc = await getCachedGuvencTravelPins();
  if (!guvenc) {
    return buildStaticFallbackRows();
  }

  const visitedCountries = DEMO_MAP_SHOWCASE_COUNTRIES.map((country) => ({
    ...country,
    user_id: DEMO_USER_ID,
  }));
  const visitedCities = pickGuvencCitiesForJennifer(guvenc.visitedCities);
  const visitedParks = pickGuvencParksForJennifer(guvenc.visitedParks);
  const wishlistCountries = guvenc.wishlistCountries.map((row) => ({
    ...row,
    user_id: DEMO_USER_ID,
  }));
  const stats = buildJenniferStats(visitedCities, visitedParks);

  return {
    visitedCountries,
    visitedCities,
    visitedParks,
    wishlistCountries,
    stats,
    visitedCodes: jenniferShowcaseVisitedCodes(),
    wishlistCodes: getWishlistCountryCodes(wishlistCountries),
  };
}
