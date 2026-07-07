import { NextResponse } from "next/server";
import { COUNTRY_LIST, getCountryName } from "@/lib/data/countries";
import { searchTouristCitiesInCountries } from "@/lib/data/tourist-cities";

const COUNTRY_CODES = COUNTRY_LIST.map((country) => country.code);

/** Public city search for registration (no auth). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ cities: [] });
  }

  const cities = searchTouristCitiesInCountries(COUNTRY_CODES, q, 24).map((city) => ({
    cityName: city.name,
    countryCode: city.countryCode,
    countryName: getCountryName(city.countryCode),
    latitude: city.latitude,
    longitude: city.longitude,
  }));

  return NextResponse.json(
    { cities },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
