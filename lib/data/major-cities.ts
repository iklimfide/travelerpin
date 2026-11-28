import majorCitiesByCountry from "./major-cities.json";
import { LIMITS } from "@/lib/constants";

export type MajorCity = {
  name: string;
  latitude: number;
  longitude: number;
  population: number;
};

const catalog = majorCitiesByCountry as Record<string, MajorCity[]>;

const COUNTRY_MIN_POPULATION = LIMITS.countryMinCityPopulation as Record<string, number>;
const COUNTRY_KEEP_CITIES = LIMITS.countryKeepCities as Record<string, readonly string[]>;

export function getMinCityPopulationForCountry(countryCode: string): number {
  const code = countryCode.toUpperCase();
  if (COUNTRY_MIN_POPULATION[code] != null) return COUNTRY_MIN_POPULATION[code];
  const count = (catalog[code] ?? []).length;
  if (count >= LIMITS.largeCityCatalogMinCount) return LIMITS.largeCityCatalogMinPopulation;
  return LIMITS.minCityPopulation;
}

export function cityMeetsCatalogPopulation(
  countryCode: string,
  name: string,
  population: number
): boolean {
  if (population >= getMinCityPopulationForCountry(countryCode)) return true;
  const keep = COUNTRY_KEEP_CITIES[countryCode.toUpperCase()];
  if (!keep) return false;
  const key = name.trim().toLowerCase();
  return keep.some((item) => item.toLowerCase() === key);
}

/** Cities only — JSON is 100k+; country floors (e.g. CN 2M) apply at read time. */
export function getMajorCitiesForCountry(countryCode: string): MajorCity[] {
  const code = countryCode.toUpperCase();
  const cities = catalog[code] ?? [];
  return cities.filter((city) => cityMeetsCatalogPopulation(code, city.name, city.population));
}

export function getMinCityPopulation(): number {
  return LIMITS.minCityPopulation;
}
