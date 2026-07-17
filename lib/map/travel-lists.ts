import { getCountryName } from "@/lib/data/countries";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

export type TravelCountryItem = {
  code: string;
  name: string;
};

export type TravelCityItem = {
  id: string;
  city_name: string;
  country_code: string;
  country_name: string;
};

export function buildVisitedCountryList(
  countries: VisitedCountry[],
  cities: VisitedCity[],
  extraCodes: string[] = [],
  parks: VisitedPark[] = [],
  locale: Locale = defaultLocale
): TravelCountryItem[] {
  const map = new Map<string, TravelCountryItem>();

  for (const country of countries) {
    const code = country.country_code.toUpperCase();
    map.set(code, {
      code: country.country_code,
      name: getCountryName(country.country_code, locale),
    });
  }

  for (const city of cities) {
    const code = city.country_code.toUpperCase();
    if (!map.has(code)) {
      map.set(code, {
        code: city.country_code,
        name: getCountryName(city.country_code, locale),
      });
    }
  }

  for (const park of parks) {
    const code = park.country_code.toUpperCase();
    if (!map.has(code)) {
      map.set(code, {
        code: park.country_code,
        name: getCountryName(park.country_code, locale),
      });
    }
  }

  for (const raw of extraCodes) {
    const code = raw.toUpperCase();
    if (!map.has(code)) {
      map.set(code, {
        code: raw,
        name: getCountryName(raw, locale),
      });
    }
  }

  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, locale === "tr" ? "tr" : "en")
  );
}

export function buildVisitedCityList(cities: VisitedCity[]): TravelCityItem[] {
  return [...cities].sort((a, b) => {
    const byCountry = a.country_name.localeCompare(b.country_name);
    if (byCountry !== 0) return byCountry;
    return a.city_name.localeCompare(b.city_name);
  });
}
