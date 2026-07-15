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
