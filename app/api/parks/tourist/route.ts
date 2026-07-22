import { NextResponse } from "next/server";
import { searchTouristParks } from "@/lib/data/tourist-park-search";
import {
  applyParkOverlay,
  attachParkNameTr,
  getCatalogOverlayFresh,
} from "@/lib/kamikaze/catalog-overlay";
import { isLocale, type Locale, defaultLocale } from "@/lib/i18n/config";
import { PARK_TYPES, type ParkType } from "@/types/database";

export const dynamic = "force-dynamic";

function parseLocale(value: string | null): Locale {
  if (value && isLocale(value)) return value;
  return defaultLocale;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.toUpperCase();
  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") as ParkType | null;
  const locale = parseLocale(searchParams.get("locale"));

  if (!country || country.length !== 2) {
    return NextResponse.json({ error: "Invalid country code" }, { status: 400 });
  }

  if (type && !PARK_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid park type" }, { status: 400 });
  }

  const base = searchTouristParks(country, q, 100, type ?? undefined, locale);
  const overlay = await getCatalogOverlayFresh();
  const parks = attachParkNameTr(
    applyParkOverlay(base, overlay, {
      countryCode: country,
      query: q,
      parkType: type ?? undefined,
      limit: 100,
      locale,
    })
  );

  return NextResponse.json(
    {
      parks: parks.map((park) => ({
        parkType: park.parkType,
        countryCode: park.countryCode,
        name: park.name,
        nameTr: park.nameTr,
        latitude: park.latitude,
        longitude: park.longitude,
        highlighted: park.highlighted ?? false,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
