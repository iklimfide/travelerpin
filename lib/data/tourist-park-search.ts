import type { Locale } from "@/lib/i18n/config";
import { defaultLocale } from "@/lib/i18n/config";
import {
  findCanonicalParksByLocalizedQuery,
  parkMatchesLocalizedSearch,
} from "@/lib/i18n/park-place-names";
import type { TouristPark } from "./tourist-parks";
import { TOURIST_PARKS } from "./tourist-parks";
import { matchesParkTypeFilter } from "@/lib/utils/park-type";
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
  parkType?: TouristPark["parkType"],
  locale: Locale = defaultLocale
): TouristPark[] {
  const code = countryCode.toUpperCase();
  const q = query.trim();

  let results = TOURIST_PARKS.filter(
    (park) =>
      park.countryCode === code && matchesParkTypeFilter(park.parkType, parkType)
  );

  if (q.length >= 2) {
    results = results.filter((park) =>
      parkMatchesLocalizedSearch(code, park.name, q, locale)
    );
  }

  if (q.length >= 2 && locale === "tr") {
    const keys = new Set(
      results.map((park) => `${park.parkType}:${park.name.toLowerCase()}`)
    );
    for (const hit of findCanonicalParksByLocalizedQuery(q, locale)) {
      if (hit.countryCode.toUpperCase() !== code) continue;
      const fromCatalog = TOURIST_PARKS.find(
        (park) =>
          park.countryCode === code &&
          formatParkSearchKey(park.name) === formatParkSearchKey(hit.parkName)
      );
      if (!fromCatalog || !matchesParkTypeFilter(fromCatalog.parkType, parkType)) continue;
      const dedupeKey = `${fromCatalog.parkType}:${fromCatalog.name.toLowerCase()}`;
      if (keys.has(dedupeKey)) continue;
      results.push(fromCatalog);
      keys.add(dedupeKey);
    }
  }

  return results.sort((a, b) => compareNames(a.name, b.name)).slice(0, limit);
}

function formatParkSearchKey(name: string): string {
  return name.trim().toLocaleLowerCase("tr");
}

export function searchTouristParksInCountries(
  countryCodes: string[],
  query: string,
  limit = 80,
  locale: Locale = defaultLocale
): TouristPark[] {
  const allowed = new Set(countryCodes.map((code) => code.toUpperCase()));
  const q = query.trim();
  if (q.length < 2 || allowed.size === 0) {
    return [];
  }

  const results = TOURIST_PARKS.filter(
    (park) =>
      allowed.has(park.countryCode) &&
      parkMatchesLocalizedSearch(park.countryCode, park.name, q, locale)
  );

  if (locale === "tr") {
    const keys = new Set(
      results.map((park) => `${park.countryCode}:${park.parkType}:${park.name.toLowerCase()}`)
    );
    for (const hit of findCanonicalParksByLocalizedQuery(q, locale)) {
      const code = hit.countryCode.toUpperCase();
      if (!allowed.has(code)) continue;
      const fromCatalog = TOURIST_PARKS.find(
        (park) =>
          park.countryCode === code &&
          formatParkSearchKey(park.name) === formatParkSearchKey(hit.parkName)
      );
      if (!fromCatalog) continue;
      const dedupeKey = `${fromCatalog.countryCode}:${fromCatalog.parkType}:${fromCatalog.name.toLowerCase()}`;
      if (keys.has(dedupeKey)) continue;
      results.push(fromCatalog);
      keys.add(dedupeKey);
    }
  }

  return results.sort((a, b) => compareNames(a.name, b.name)).slice(0, limit);
}

export function findTouristParksBySlug(slug: string): TouristPark[] {
  const target = slug.trim().toLowerCase();
  if (!target) return [];

  return TOURIST_PARKS.filter((park) => buildParkSlug(park.name) === target);
}
