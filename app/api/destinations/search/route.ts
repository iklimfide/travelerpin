import { NextResponse } from "next/server";
import { COUNTRY_LIST, searchCountries, getCountryName } from "@/lib/data/countries";
import {
  buildCountryModalCities,
  searchModalCitiesInCountries,
} from "@/lib/data/country-page-cities";
import { searchTouristParksInCountries } from "@/lib/data/tourist-park-search";
import {
  applyParkOverlay,
  cityNameTrOverrideMap,
  getCatalogOverlay,
} from "@/lib/kamikaze/catalog-overlay";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import { isLocale, type Locale, defaultLocale } from "@/lib/i18n/config";
import {
  findCanonicalCitiesByLocalizedQuery,
  getLocalizedCityName,
} from "@/lib/i18n/place-names";
import { getLocalizedParkName } from "@/lib/i18n/park-place-names";
import { canonicalCityName } from "@/lib/utils/city-aliases";
import { matchesPlaceNameSearch } from "@/lib/utils/place-search";
import { createClient } from "@/lib/supabase/server";

const COUNTRY_CODES = COUNTRY_LIST.map((country) => country.code);

function parseLocale(value: string | null): Locale {
  if (value && isLocale(value)) return value;
  return defaultLocale;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const locale = parseLocale(searchParams.get("locale"));

  if (q.length < 2) {
    return NextResponse.json({ countries: [], cities: [], parks: [] });
  }

  const countries = searchCountries(q, 12, locale).map((country) => ({
    code: country.code,
    name: country.name,
  }));

  const overlay = await getCatalogOverlay();
  const nameTrOverrides = cityNameTrOverrideMap(overlay);

  const baseCities = searchModalCitiesInCountries(COUNTRY_CODES, overlay, q, 40).map((city) => ({
    countryCode: city.countryCode,
    name: city.name,
    latitude: city.latitude,
    longitude: city.longitude,
  }));

  const cityKeys = new Set(
    baseCities.map(
      (city) => `${city.countryCode}:${catalogNameKey(city.name, city.countryCode)}`
    )
  );

  function pushModalCity(code: string, cityName: string) {
    const upper = code.toUpperCase();
    const key = `${upper}:${catalogNameKey(cityName, upper)}`;
    if (cityKeys.has(key)) return false;

    const fromModal = buildCountryModalCities(upper, overlay, "").find(
      (city) => canonicalCityName(upper, city.name) === canonicalCityName(upper, cityName)
    );
    if (!fromModal) return false;

    baseCities.push({
      countryCode: upper,
      name: canonicalCityName(upper, fromModal.name),
      latitude: fromModal.latitude,
      longitude: fromModal.longitude,
    });
    cityKeys.add(key);
    return true;
  }

  for (const hit of findCanonicalCitiesByLocalizedQuery(q, locale)) {
    pushModalCity(hit.countryCode, hit.cityName);
    if (baseCities.length >= 40) break;
  }

  if (locale === "tr") {
    for (const row of overlay.nameTr) {
      if (!matchesPlaceNameSearch(row.name_tr, q)) continue;
      const code = row.country_code.toUpperCase();
      if (pushModalCity(code, row.name_key)) {
        if (baseCities.length >= 40) break;
      }
    }
  }

  const deduped = new Map<string, (typeof baseCities)[number]>();
  for (const city of baseCities) {
    const code = city.countryCode.toUpperCase();
    const key = `${code}:${catalogNameKey(city.name, code)}`;
    if (deduped.has(key)) continue;
    deduped.set(key, {
      ...city,
      countryCode: code,
      name: canonicalCityName(code, city.name),
    });
  }

  const cities = [...deduped.values()].slice(0, 24).map((city) => ({
    cityName: city.name,
    displayName: getLocalizedCityName(city.countryCode, city.name, locale, nameTrOverrides),
    countryCode: city.countryCode,
    countryName: getCountryName(city.countryCode, locale),
    latitude: city.latitude,
    longitude: city.longitude,
  }));

  const parks = applyParkOverlay(
    searchTouristParksInCountries(COUNTRY_CODES, q, 24, locale),
    overlay,
    { countryCodes: COUNTRY_CODES, query: q, limit: 24, locale }
  ).map((park) => ({
    parkName: park.name,
    displayName: getLocalizedParkName(park.countryCode, park.name, locale),
    parkType: park.parkType,
    countryCode: park.countryCode,
    countryName: getCountryName(park.countryCode, locale),
    latitude: park.latitude,
    longitude: park.longitude,
  }));

  return NextResponse.json({ countries, cities, parks });
}
