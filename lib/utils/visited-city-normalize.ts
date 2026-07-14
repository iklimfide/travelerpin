import { getCountryName } from "@/lib/data/countries";
import { canonicalCityKey, canonicalCityName } from "@/lib/utils/city-aliases";
import type { VisitedCity } from "@/types/database";

function pickPreferredVisitedCity(a: VisitedCity, b: VisitedCity): VisitedCity {
  const aVisits = a.visit_dates?.length ?? 0;
  const bVisits = b.visit_dates?.length ?? 0;
  if (aVisits !== bVisits) return aVisits > bVisits ? a : b;

  const aTime = Date.parse(a.created_at);
  const bTime = Date.parse(b.created_at);
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
    return aTime <= bTime ? a : b;
  }

  return a.id.localeCompare(b.id) <= 0 ? a : b;
}

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

    byKey.set(key, normalizeVisitedCityForDisplay(pickPreferredVisitedCity(existing, city)));
  }

  return [...byKey.values()];
}
