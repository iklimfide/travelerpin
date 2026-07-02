import { NextResponse } from "next/server";
import { COUNTRY_LIST, searchCountries, getCountryName } from "@/lib/data/countries";
import { searchTouristCitiesInCountries } from "@/lib/data/tourist-cities";
import { searchTouristParksInCountries } from "@/lib/data/tourist-park-search";
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

  const cities = searchTouristCitiesInCountries(COUNTRY_CODES, q, 24).map((city) => ({
    cityName: city.name,
    countryCode: city.countryCode,
    countryName: getCountryName(city.countryCode),
    latitude: city.latitude,
    longitude: city.longitude,
  }));

  const parks = searchTouristParksInCountries(COUNTRY_CODES, q, 24).map((park) => ({
    parkName: park.name,
    parkType: park.parkType,
    countryCode: park.countryCode,
    countryName: park.countryName,
    latitude: park.latitude,
    longitude: park.longitude,
  }));

  return NextResponse.json({ countries, cities, parks });
}
