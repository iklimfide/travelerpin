import { getCountryName } from "@/lib/data/countries";
import { DEFAULT_CITY_HERO_IMAGE } from "@/lib/constants";
import { resolveCountryHubSlug } from "@/lib/data/country-hubs";
import { findCityHubSlug } from "@/lib/data/city-hubs";
import { findParkHubSlug } from "@/lib/data/park-hubs";
import { buildVisitedCountryList } from "@/lib/map/travel-lists";
import { buildCitySlug } from "@/lib/utils/city-slug";
import type { ParkType } from "@/lib/data/tourist-park-search";
import { cityVisitCount } from "@/lib/utils/visit-date";
import { formatCityDisplayName } from "@/lib/utils/city-name";
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

function countryTripCreatedAt(
  code: string,
  visitedByCode: Map<string, VisitedCountry>,
  citiesByCountry: Map<string, VisitedCity[]>,
  parksByCountry: Map<string, VisitedPark[]>
): string {
  const visited = visitedByCode.get(code.toUpperCase());
  if (visited) return visited.created_at;

  const dates: number[] = [];
  for (const city of citiesByCountry.get(code.toUpperCase()) ?? []) {
    dates.push(new Date(city.created_at).getTime());
  }
  for (const park of parksByCountry.get(code.toUpperCase()) ?? []) {
    dates.push(new Date(park.created_at).getTime());
  }
  if (dates.length === 0) return new Date(0).toISOString();
  return new Date(Math.max(...dates)).toISOString();
}

function sortProfileTripsByKindAndDate(
  trips: ProfileTrip[],
  residence?: string | null
): ProfileTrip[] {
  const residenceCountryCode = resolveResidenceCountryCode(residence);

  const countries = trips
    .filter((trip) => trip.kind === "country")
    .sort(sortTripsByDateDesc);
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
  visitedCodes: string[] = []
): ProfileTrip[] {
  const countryList = buildVisitedCountryList(
    visitedCountries,
    cities,
    visitedCodes,
    parks
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
      createdAt: countryTripCreatedAt(code, visitedByCode, citiesByCountry, parksByCountry),
      badge: null,
    };
  });

  const sortedCities = [...cities].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const recentThreshold = sortedCities[0]?.created_at;

  const cityTrips: ProfileTrip[] = sortedCities.map((city) => ({
    id: city.id,
    kind: "city",
    placeName: city.city_name,
    citySlug: cityHubSlug(city.country_code, city.city_name),
    parkSlug: null,
    parkType: null,
    countryCode: city.country_code,
    countryName: getCountryName(city.country_code),
    countrySlug: countryHubSlug(city.country_code),
    imageUrl: DEFAULT_CITY_HERO_IMAGE,
    note: city.note,
    createdAt: city.created_at,
    badge: tripBadge(city, city.created_at === recentThreshold),
  }));

  const parkTrips: ProfileTrip[] = parks.map((park) => ({
    id: park.id,
    kind: "park",
    placeName: formatCityDisplayName(park.park_name),
    citySlug: null,
    parkSlug: findParkHubSlug(park.park_name, park.country_code),
    parkType: park.park_type,
    countryCode: park.country_code,
    countryName: getCountryName(park.country_code),
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
  wishlistCountries: WishlistCountry[]
): ProfileSummary {
  let topCity: ProfileSummary["topCity"] = null;
  let topVisits = 0;

  for (const city of visitedCities) {
    const visits = cityVisitCount(city);
    if (visits > topVisits) {
      topVisits = visits;
      topCity = {
        name: city.city_name,
        countryName: getCountryName(city.country_code),
        citySlug: cityHubSlug(city.country_code, city.city_name),
        countrySlug: countryHubSlug(city.country_code),
      };
    }
  }

  const countryCount = buildVisitedCountryList(
    visitedCountries,
    visitedCities,
    [],
    visitedParks
  ).length;

  const repeatCityCount = visitedCities.filter((city) => cityVisitCount(city) > 1).length;
  const nextWishlist = wishlistCountries[0]
    ? {
        name: wishlistCountries[0].country_name,
        code: wishlistCountries[0].country_code,
        countrySlug: countryHubSlug(wishlistCountries[0].country_code, wishlistCountries[0].country_name),
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
  visitedParks: VisitedPark[]
): LatestVisitedCountry | null {
  const items: { name: string; code: string; at: number }[] = [];

  for (const country of visitedCountries) {
    items.push({
      name: country.country_name,
      code: country.country_code,
      at: new Date(country.created_at).getTime(),
    });
  }
  for (const city of visitedCities) {
    items.push({
      name: city.country_name,
      code: city.country_code,
      at: new Date(city.created_at).getTime(),
    });
  }
  for (const park of visitedParks) {
    items.push({
      name: park.country_name,
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
