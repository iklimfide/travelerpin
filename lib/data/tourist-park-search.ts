import type { TouristPark } from "./tourist-parks";
import { TOURIST_PARKS } from "./tourist-parks";
import { matchesParkTypeFilter } from "@/lib/utils/park-type";
import { matchesPlaceNameSearch } from "@/lib/utils/place-search";
import { buildParkSlug } from "@/lib/utils/park-slug";

export type { ParkType, TouristPark } from "./tourist-parks";

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, "tr", { sensitivity: "base" });
}

export function getTouristParksByCountry(
  countryCode: string,
  parkType?: TouristPark["parkType"]
): TouristPark[] {
  const code = countryCode.toUpperCase();
  return TOURIST_PARKS.filter(
    (park) => park.countryCode === code && matchesParkTypeFilter(park.parkType, parkType)
  ).sort((a, b) => compareNames(a.name, b.name));
}

export function searchTouristParks(
  countryCode: string,
  query = "",
  limit = 80,
  parkType?: TouristPark["parkType"]
): TouristPark[] {
  const code = countryCode.toUpperCase();
  const q = query.trim().toLocaleLowerCase("tr");

  let results = TOURIST_PARKS.filter(
    (park) =>
      park.countryCode === code && matchesParkTypeFilter(park.parkType, parkType)
  );

  if (q.length >= 2) {
    results = results.filter((park) => matchesPlaceNameSearch(park.name, q));
  }

  return results.sort((a, b) => compareNames(a.name, b.name)).slice(0, limit);
}

export function searchTouristParksInCountries(
  countryCodes: string[],
  query: string,
  limit = 80
): TouristPark[] {
  const allowed = new Set(countryCodes.map((code) => code.toUpperCase()));
  const q = query.trim().toLocaleLowerCase("tr");
  if (q.length < 2 || allowed.size === 0) {
    return [];
  }

  const results = TOURIST_PARKS.filter(
    (park) => allowed.has(park.countryCode) && matchesPlaceNameSearch(park.name, q)
  );

  return results.sort((a, b) => compareNames(a.name, b.name)).slice(0, limit);
}

export function findTouristParksBySlug(slug: string): TouristPark[] {
  const target = slug.trim().toLowerCase();
  if (!target) return [];

  return TOURIST_PARKS.filter((park) => buildParkSlug(park.name) === target);
}
