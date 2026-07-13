import { POPULAR_DESTINATIONS } from "@/lib/data/popular-destinations";

const POPULAR_CITY_NAMES_BY_COUNTRY = new Map<string, Set<string>>();

for (const destination of POPULAR_DESTINATIONS) {
  if (destination.kind !== "city") continue;
  const code = destination.countryCode.toUpperCase();
  const names = POPULAR_CITY_NAMES_BY_COUNTRY.get(code) ?? new Set<string>();
  names.add(destination.cityName.toLowerCase());
  POPULAR_CITY_NAMES_BY_COUNTRY.set(code, names);
}

export function isPopularTouristCity(countryCode: string, cityName: string): boolean {
  const names = POPULAR_CITY_NAMES_BY_COUNTRY.get(countryCode.toUpperCase());
  if (!names) return false;
  return names.has(cityName.toLowerCase());
}
