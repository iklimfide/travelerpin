import { isUkNationCode, isUkNationVisited } from "@/lib/data/uk-nations";

export function countryHasMappedPlaces(
  countryCode: string,
  cities: { country_code: string }[],
  parks: { country_code: string }[] = []
): boolean {
  const code = countryCode.toUpperCase();
  return (
    cities.some((city) => city.country_code.toUpperCase() === code) ||
    parks.some((park) => park.country_code.toUpperCase() === code)
  );
}

export function isCountryOnVisitedMap(
  countryCode: string,
  visitedCodes: ReadonlySet<string>
): boolean {
  const code = countryCode.toUpperCase();
  return isUkNationCode(code) ? isUkNationVisited(code, visitedCodes) : visitedCodes.has(code);
}

/** Country row exists with no cities/parks — safe to uncheck in Add modal. */
export function isCountryOnlyPinRemovable(
  countryCode: string,
  visitedCodes: ReadonlySet<string>,
  visitedCountries: { country_code: string; id: string }[],
  visitedCities: { country_code: string }[],
  visitedParks: { country_code: string }[] = []
): boolean {
  if (!isCountryOnVisitedMap(countryCode, visitedCodes)) return false;
  if (countryHasMappedPlaces(countryCode, visitedCities, visitedParks)) return false;
  const code = countryCode.toUpperCase();
  return visitedCountries.some((country) => country.country_code.toUpperCase() === code);
}

export function isCountryRemoveBlockedByPlacesError(error: string | undefined): boolean {
  if (!error) return false;
  const lower = error.toLowerCase();
  return (
    (lower.includes("remove cities") && lower.includes("first")) ||
    (lower.includes("delete") && lower.includes("cities or parks")) ||
    (lower.includes("delete the cities") && lower.includes("this region")) ||
    (lower.includes("delete the cities") && lower.includes("this country"))
  );
}
