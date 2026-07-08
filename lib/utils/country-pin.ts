import { getCountryName } from "@/lib/data/countries";
import type { VisitedCity } from "@/types/database";

/** City pin that stores country-level media/notes (city name matches country label). */
export function findCountryBackingCity(
  countryCode: string,
  visitedCities: VisitedCity[]
): VisitedCity | undefined {
  const code = countryCode.toUpperCase();
  const label = getCountryName(countryCode).toLowerCase();

  return visitedCities.find(
    (city) =>
      city.country_code.toUpperCase() === code && city.city_name.toLowerCase() === label
  );
}
