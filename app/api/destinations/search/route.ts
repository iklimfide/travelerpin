import { NextResponse } from "next/server";
import { COUNTRY_LIST, searchCountries, getCountryName } from "@/lib/data/countries";
import { searchTouristCitiesInCountries } from "@/lib/data/tourist-cities";
import { searchTouristParksInCountries } from "@/lib/data/tourist-park-search";
import {
  applyParkOverlay,
  exclusionSet,
  getCatalogOverlay,
} from "@/lib/kamikaze/catalog-overlay";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import { canonicalCityName } from "@/lib/utils/city-aliases";
import { matchesPlaceNameSearch } from "@/lib/utils/place-search";
import { createClient } from "@/lib/supabase/server";

const COUNTRY_CODES = COUNTRY_LIST.map((country) => country.code);

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

  if (q.length < 2) {
    return NextResponse.json({ countries: [], cities: [], parks: [] });
  }

  const countries = searchCountries(q, 12).map((country) => ({
    code: country.code,
    name: country.name,
  }));

  const overlay = await getCatalogOverlay();
  const cityExcluded = exclusionSet(overlay, "city");

  const baseCities = searchTouristCitiesInCountries(COUNTRY_CODES, q, 40).filter(
    (city) =>
      !cityExcluded.has(
        `${city.countryCode}:${catalogNameKey(city.name, city.countryCode)}`
      )
  );

  const cityKeys = new Set(
    baseCities.map(
      (city) => `${city.countryCode}:${catalogNameKey(city.name, city.countryCode)}`
    )
  );
  for (const row of overlay.cities) {
    const code = row.country_code.toUpperCase();
    const key = `${code}:${catalogNameKey(row.name, code)}`;
    if (cityKeys.has(key) || cityExcluded.has(key)) continue;
    if (!matchesPlaceNameSearch(row.name, q)) continue;
    baseCities.push({
      countryCode: code,
      name: row.name,
      latitude: row.latitude ?? 0,
      longitude: row.longitude ?? 0,
    });
    cityKeys.add(key);
    if (baseCities.length >= 40) break;
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
    countryCode: city.countryCode,
    countryName: getCountryName(city.countryCode),
    latitude: city.latitude,
    longitude: city.longitude,
  }));

  const parks = applyParkOverlay(
    searchTouristParksInCountries(COUNTRY_CODES, q, 24),
    overlay,
    { countryCodes: COUNTRY_CODES, query: q, limit: 24 }
  ).map((park) => ({
    parkName: park.name,
    parkType: park.parkType,
    countryCode: park.countryCode,
    countryName: park.countryName,
    latitude: park.latitude,
    longitude: park.longitude,
  }));

  return NextResponse.json({ countries, cities, parks });
}

