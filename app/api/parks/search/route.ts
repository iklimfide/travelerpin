import { NextResponse } from "next/server";
import { searchTouristParksInCountries } from "@/lib/data/tourist-park-search";
import {
  applyParkOverlay,
  getCatalogOverlay,
} from "@/lib/kamikaze/catalog-overlay";
import { parkTypeLabel } from "@/lib/utils/park-type";
import { createClient } from "@/lib/supabase/server";
import type { ParkType } from "@/types/database";

type CountryRef = {
  code: string;
  name: string;
};

function parseCountriesParam(raw: string): CountryRef[] {
  return raw
    .split(",")
    .map((part) => {
      const [code, ...nameParts] = part.split("|");
      const name = decodeURIComponent(nameParts.join("|")).trim();
      if (!code || code.length !== 2 || !name) {
        return null;
      }
      return { code: code.toUpperCase(), name };
    })
    .filter((item): item is CountryRef => item !== null);
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
  const countriesParam = searchParams.get("countries");

  if (!countriesParam) {
    return NextResponse.json({ error: "No countries specified" }, { status: 400 });
  }

  const countries = parseCountriesParam(countriesParam);
  if (countries.length === 0) {
    return NextResponse.json({ error: "No countries specified" }, { status: 400 });
  }

  if (q.length < 2) {
    return NextResponse.json({ parks: [] });
  }

  const nameByCode = new Map(countries.map((c) => [c.code.toUpperCase(), c.name]));
  const showCountry = countries.length > 1;
  const seen = new Set<string>();

  const overlay = await getCatalogOverlay();
  const parks = applyParkOverlay(
    searchTouristParksInCountries(
      countries.map((c) => c.code),
      q,
      100
    ),
    overlay,
    {
      countryCodes: countries.map((c) => c.code),
      query: q,
      limit: 100,
    }
  )
    .filter((park) => {
      const key = `${park.countryCode}:${park.parkType}:${park.name.toLocaleLowerCase("tr")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((park) => {
      const countryCode = park.countryCode.toUpperCase();
      const countryName = nameByCode.get(countryCode) ?? park.countryName;
      const typeLabel = parkTypeLabel(park.parkType);
      const subtitle = showCountry ? `${countryName} · ${typeLabel}` : typeLabel;

      return {
        id: `${countryCode}-${park.parkType}-${park.name}`,
        name: park.name,
        parkType: park.parkType as ParkType,
        subtitle,
        latitude: park.latitude,
        longitude: park.longitude,
        country_code: countryCode,
        country_name: countryName,
      };
    });

  return NextResponse.json({ parks });
}
