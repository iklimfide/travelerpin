import { NextResponse } from "next/server";
import { buildCountryModalCities } from "@/lib/data/country-page-cities";
import {
  attachCityNameTr,
  buildCityTiers,
  getCatalogOverlayFresh,
  sortCitiesForAddModal,
} from "@/lib/kamikaze/catalog-overlay";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.toUpperCase();
  const q = searchParams.get("q")?.trim() ?? "";

  if (!country || country.length !== 2) {
    return NextResponse.json({ error: "Country is required" }, { status: 400 });
  }

  const overlay = await getCatalogOverlayFresh();
  const allCities = attachCityNameTr(
    sortCitiesForAddModal(buildCountryModalCities(country, overlay, q)),
    overlay
  );

  const tiers =
    q.length >= 2
      ? allCities.length > 0
        ? [{ level: 1, cities: allCities }]
        : []
      : buildCityTiers(allCities);

  return NextResponse.json(
    { cities: allCities, tiers },
    { headers: { "Cache-Control": "no-store" } }
  );
}
