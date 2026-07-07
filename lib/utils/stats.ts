import type {
  TravelStats,
  VisitedCity,
  VisitedCountry,
  VisitedPark,
  WishlistCountry,
} from "@/types/database";
import { isNaturaParkType, isThemeParkType } from "@/lib/utils/park-type";
import { cityVisitCount } from "@/lib/utils/visit-date";

function countryVisitTotals(
  countries: VisitedCountry[],
  cities: VisitedCity[],
  parks: VisitedPark[]
): Map<string, number> {
  const totals = new Map<string, number>();

  for (const city of cities) {
    const code = city.country_code.toUpperCase();
    totals.set(code, (totals.get(code) ?? 0) + cityVisitCount(city));
  }

  for (const country of countries) {
    const code = country.country_code.toUpperCase();
    if (!totals.has(code)) totals.set(code, 1);
  }

  for (const park of parks) {
    const code = park.country_code.toUpperCase();
    if (!totals.has(code)) totals.set(code, 1);
  }

  return totals;
}

export function computeTravelStats(
  countries: VisitedCountry[],
  cities: VisitedCity[],
  parks: VisitedPark[] = []
): TravelStats {
  const countryTotals = countryVisitTotals(countries, cities, parks);

  return {
    countries: countryTotals.size,
    cities: cities.length,
    nationalParks: parks.filter((p) => isNaturaParkType(p.park_type)).length,
    themeParks: parks.filter((p) => isThemeParkType(p.park_type)).length,
  };
}

/** Sum of country/city visits including repeat dates (for share copy or analytics). */
export function computeTotalVisitCounts(
  countries: VisitedCountry[],
  cities: VisitedCity[],
  parks: VisitedPark[] = []
): { countryVisits: number; cityVisits: number } {
  const countryTotals = countryVisitTotals(countries, cities, parks);
  const countryVisits = [...countryTotals.values()].reduce((sum, count) => sum + count, 0);
  const cityVisits = cities.reduce((sum, city) => sum + cityVisitCount(city), 0);
  return { countryVisits, cityVisits };
}

export function getVisitedCountryCodes(
  countries: VisitedCountry[],
  cities: VisitedCity[] = [],
  parks: VisitedPark[] = []
): string[] {
  const codes = new Set([
    ...countries.map((c) => c.country_code.toUpperCase()),
    ...cities.map((c) => c.country_code.toUpperCase()),
    ...parks.map((p) => p.country_code.toUpperCase()),
  ]);
  return [...codes];
}

export function getWishlistCountryCodes(wishlist: WishlistCountry[]): string[] {
  return wishlist.map((c) => c.country_code.toUpperCase());
}

export function computeRepeatVisitSummary(
  _countries: VisitedCountry[],
  cities: VisitedCity[],
  _parks: VisitedPark[] = []
): { countriesVisitedMoreThanOnce: number; citiesVisitedMoreThanOnce: number } {
  const citiesVisitedMoreThanOnce = cities.filter((city) => cityVisitCount(city) > 1).length;

  const countriesWithRepeatCityVisits = new Set<string>();
  for (const city of cities) {
    if (cityVisitCount(city) > 1) {
      countriesWithRepeatCityVisits.add(city.country_code.toUpperCase());
    }
  }

  return {
    countriesVisitedMoreThanOnce: countriesWithRepeatCityVisits.size,
    citiesVisitedMoreThanOnce,
  };
}
