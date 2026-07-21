import { getCountryName } from "@/lib/data/countries";
import { resolveCityHeroImageUrl } from "@/lib/city/city-hero-images";
import { DEFAULT_CITY_HERO_IMAGE } from "@/lib/constants";
import { resolveCountryHubSlug } from "@/lib/data/country-hubs";
import { findCityHubSlug } from "@/lib/data/city-hubs";
import { findParkHubSlug } from "@/lib/data/park-hubs";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import { getLocalizedCityName } from "@/lib/i18n/place-names";
import { buildVisitedCountryList } from "@/lib/map/travel-lists";
import { buildCitySlug } from "@/lib/utils/city-slug";
import type { ParkType } from "@/lib/data/tourist-park-search";
import { cityVisitCount } from "@/lib/utils/visit-date";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { canonicalCityName } from "@/lib/utils/city-aliases";
import { getDefaultParkHeroImage } from "@/lib/utils/park-hero-image";
import { resolveResidenceCountryCode } from "@/lib/utils/residence-city";
import type { VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";

export const WORLD_COUNTRY_TOTAL = 195;

function countryHubSlug(countryCode: string, countryName?: string): string | null {
  return resolveCountryHubSlug(countryCode, countryName);
}

function cityHubSlug(countryCode: string, cityName: string): string | null {
  return findCityHubSlug(countryCode, cityName) ?? buildCitySlug(cityName);
}

export type ProfileTrip = {
  id: string;
  kind: "country" | "city" | "park";
  placeName: string;
  citySlug: string | null;
  parkSlug: string | null;
  parkType: ParkType | null;
  countryCode: string;
  countryName: string;
  countrySlug: string | null;
  imageUrl: string | null;
  note: string | null;
  createdAt: string;
  badge: "recent" | "favorite" | "dayTrip" | null;
};

export type ProfileSummary = {
  topCity: {
    name: string;
    countryName: string;
    citySlug: string | null;
    countrySlug: string | null;
  } | null;
  nextWishlist: { name: string; code: string; countrySlug: string | null } | null;
  countryCount: number;
  repeatCityCount: number;
};

export type LatestVisitedCountry = {
  name: string;
  countrySlug: string | null;
};

function parkTripImage(park: VisitedPark): string {
  return getDefaultParkHeroImage(park.park_type);
}

function tripBadge(city: VisitedCity, isRecent: boolean): ProfileTrip["badge"] {
  const visits = cityVisitCount(city);
  if (isRecent) return "recent";
  if (visits > 3) return "favorite";
  if (visits === 1) return "dayTrip";
  return null;
}

function sortTripsByDateDesc(a: ProfileTrip, b: ProfileTrip): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function deprioritizeResidenceCountry<T>(
  items: T[],
  residenceCountryCode: string | null | undefined,
  getCountryCode: (item: T) => string,
  compareWithinGroup: (a: T, b: T) => number
): T[] {
  if (!residenceCountryCode) {
    return [...items].sort(compareWithinGroup);
  }

  const homeCode = residenceCountryCode.toUpperCase();
  return [...items].sort((a, b) => {
    const aIsHome = getCountryCode(a).toUpperCase() === homeCode;
    const bIsHome = getCountryCode(b).toUpperCase() === homeCode;
    if (aIsHome !== bIsHome) return aIsHome ? 1 : -1;
    return compareWithinGroup(a, b);
  });
}

function parseCreatedAtMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Latest pin time for a country (country row, city, or park). */
export function countryLastPinnedAt(
  code: string,
  visitedByCode: Map<string, VisitedCountry>,
  citiesByCountry: Map<string, VisitedCity[]>,
  parksByCountry: Map<string, VisitedPark[]>
): string {
  const upper = code.toUpperCase();
  const dates: number[] = [];
  const visited = visitedByCode.get(upper);
  const visitedMs = parseCreatedAtMs(visited?.created_at);
  if (visitedMs != null) dates.push(visitedMs);
  for (const city of citiesByCountry.get(upper) ?? []) {
    const ms = parseCreatedAtMs(city.created_at);
    if (ms != null) dates.push(ms);
  }
  for (const park of parksByCountry.get(upper) ?? []) {
    const ms = parseCreatedAtMs(park.created_at);
    if (ms != null) dates.push(ms);
  }
  if (dates.length === 0) return new Date(0).toISOString();
  return new Date(Math.max(...dates)).toISOString();
}

function sortProfileTripsByKindAndDate(
  trips: ProfileTrip[],
  residence?: string | null
): ProfileTrip[] {
  const residenceCountryCode = resolveResidenceCountryCode(residence);

  const countries = deprioritizeResidenceCountry(
    trips.filter((trip) => trip.kind === "country"),
    residenceCountryCode,
    (trip) => trip.countryCode,
    sortTripsByDateDesc
  );
  const cities = deprioritizeResidenceCountry(
    trips.filter((trip) => trip.kind === "city"),
    residenceCountryCode,
    (trip) => trip.countryCode,
    sortTripsByDateDesc
  );
  const parks = deprioritizeResidenceCountry(
    trips.filter((trip) => trip.kind === "park"),
    residenceCountryCode,
    (trip) => trip.countryCode,
    sortTripsByDateDesc
  );

  return [...countries, ...cities, ...parks];
}

export function buildProfileTrips(
  visitedCountries: VisitedCountry[],
  cities: VisitedCity[],
  parks: VisitedPark[] = [],
  residence?: string | null,
  visitedCodes: string[] = [],
  locale: Locale = defaultLocale,
  cityHeroImages?: ReadonlyMap<string, string>
): ProfileTrip[] {
  const countryList = buildVisitedCountryList(
    visitedCountries,
    cities,
    visitedCodes,
    parks,
    locale
  );

  const visitedByCode = new Map<string, VisitedCountry>();
  for (const country of visitedCountries) {
    visitedByCode.set(country.country_code.toUpperCase(), country);
  }

  const citiesByCountry = new Map<string, VisitedCity[]>();
  for (const city of cities) {
    const code = city.country_code.toUpperCase();
    const list = citiesByCountry.get(code) ?? [];
    list.push(city);
    citiesByCountry.set(code, list);
  }

  const parksByCountry = new Map<string, VisitedPark[]>();
  for (const park of parks) {
    const code = park.country_code.toUpperCase();
    const list = parksByCountry.get(code) ?? [];
    list.push(park);
    parksByCountry.set(code, list);
  }

  const countryTrips: ProfileTrip[] = countryList.map((country) => {
    const code = country.code.toUpperCase();
    const visited = visitedByCode.get(code);
    return {
      id: visited?.id ?? `country:${code}`,
      kind: "country",
      placeName: country.name,
      citySlug: null,
      parkSlug: null,
      parkType: null,
      countryCode: country.code,
      countryName: country.name,
      countrySlug: countryHubSlug(country.code, country.name),
      imageUrl: null,
      note: null,
      createdAt: countryLastPinnedAt(code, visitedByCode, citiesByCountry, parksByCountry),
      badge: null,
    };
  });

  const sortedCities = [...cities].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const recentThreshold = sortedCities[0]?.created_at;

  const cityTrips: ProfileTrip[] = sortedCities.map((city) => {
    const canonical = canonicalCityName(city.country_code, city.city_name);
    const placeName = getLocalizedCityName(city.country_code, canonical, locale);
    return {
      id: city.id,
      kind: "city",
      placeName,
      citySlug: cityHubSlug(city.country_code, canonical),
      parkSlug: null,
      parkType: null,
      countryCode: city.country_code,
      countryName: getCountryName(city.country_code, locale),
      countrySlug: countryHubSlug(city.country_code),
      imageUrl: cityHeroImages
        ? resolveCityHeroImageUrl(city.country_code, canonical, cityHeroImages)
        : DEFAULT_CITY_HERO_IMAGE,
      note: city.note,
      createdAt: city.created_at,
      badge: tripBadge(city, city.created_at === recentThreshold),
    };
  });

  const parkTrips: ProfileTrip[] = parks.map((park) => ({
    id: park.id,
    kind: "park",
    placeName: formatCityDisplayName(park.park_name),
    citySlug: null,
    parkSlug: findParkHubSlug(park.park_name, park.country_code),
    parkType: park.park_type,
    countryCode: park.country_code,
    countryName: getCountryName(park.country_code, locale),
    countrySlug: countryHubSlug(park.country_code),
    imageUrl: parkTripImage(park),
    note: park.note,
    createdAt: park.created_at,
    badge: null,
  }));

  return sortProfileTripsByKindAndDate(
    [...countryTrips, ...cityTrips, ...parkTrips],
    residence
  );
}

export function buildProfileSummary(
  visitedCountries: VisitedCountry[],
  visitedCities: VisitedCity[],
  visitedParks: VisitedPark[],
  wishlistCountries: WishlistCountry[],
  locale: Locale = defaultLocale
): ProfileSummary {
  let topCity: ProfileSummary["topCity"] = null;
  let topVisits = 0;

  for (const city of visitedCities) {
    const visits = cityVisitCount(city);
    if (visits > topVisits) {
      topVisits = visits;
      const canonical = canonicalCityName(city.country_code, city.city_name);
      topCity = {
        name: getLocalizedCityName(city.country_code, canonical, locale),
        countryName: getCountryName(city.country_code, locale),
        citySlug: cityHubSlug(city.country_code, canonical),
        countrySlug: countryHubSlug(city.country_code),
      };
    }
  }

  const countryCount = buildVisitedCountryList(
    visitedCountries,
    visitedCities,
    [],
    visitedParks,
    locale
  ).length;

  const repeatCityCount = visitedCities.filter((city) => cityVisitCount(city) > 1).length;
  const nextWishlist = wishlistCountries[0]
    ? {
        name: getCountryName(wishlistCountries[0].country_code, locale),
        code: wishlistCountries[0].country_code,
        countrySlug: countryHubSlug(wishlistCountries[0].country_code),
      }
    : null;

  return { topCity, nextWishlist, countryCount, repeatCityCount };
}

export function worldCoveragePercent(countryCount: number): number {
  if (countryCount <= 0) return 0;
  return Math.min(100, Math.round((countryCount / WORLD_COUNTRY_TOTAL) * 100));
}

export function latestVisitedCountry(
  visitedCountries: VisitedCountry[],
  visitedCities: VisitedCity[],
  visitedParks: VisitedPark[],
  locale: Locale = defaultLocale
): LatestVisitedCountry | null {
  const items: { name: string; code: string; at: number }[] = [];

  for (const country of visitedCountries) {
    items.push({
      name: getCountryName(country.country_code, locale),
      code: country.country_code,
      at: new Date(country.created_at).getTime(),
    });
  }
  for (const city of visitedCities) {
    items.push({
      name: getCountryName(city.country_code, locale),
      code: city.country_code,
      at: new Date(city.created_at).getTime(),
    });
  }
  for (const park of visitedParks) {
    items.push({
      name: getCountryName(park.country_code, locale),
      code: park.country_code,
      at: new Date(park.created_at).getTime(),
    });
  }

  items.sort((a, b) => b.at - a.at);
  const latest = items[0];
  if (!latest) return null;

  return {
    name: latest.name,
    countrySlug: countryHubSlug(latest.code),
  };
}
