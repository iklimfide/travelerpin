import { getCountryName } from "@/lib/data/countries";
import { canonicalCityKey, canonicalCityName } from "@/lib/utils/city-aliases";
import { mergeDuplicateVisitedCityRows } from "@/lib/utils/merge-profile-travel-pins";
import type { VisitedCity } from "@/types/database";

export function normalizeVisitedCityForDisplay(city: VisitedCity): VisitedCity {
  const city_name = canonicalCityName(city.country_code, city.city_name);
  const country_name = getCountryName(city.country_code);
  if (city_name === city.city_name && country_name === city.country_name) return city;
  return { ...city, city_name, country_name };
}

export function dedupeVisitedCitiesForDisplay(cities: VisitedCity[]): VisitedCity[] {
  const byKey = new Map<string, VisitedCity>();

  for (const raw of cities) {
    const city = normalizeVisitedCityForDisplay(raw);
    const key = canonicalCityKey(city.country_code, city.city_name);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, city);
      continue;
    }

    byKey.set(key, mergeDuplicateVisitedCityRows(existing, city));
  }

  return [...byKey.values()];
}
