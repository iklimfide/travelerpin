import { NextResponse } from "next/server";
import { getCityCatalog } from "@/lib/add/city-catalog";
import {
  applyCityOverlayToCatalogCities,
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

  const catalog = getCityCatalog(country, q);
  const overlay = await getCatalogOverlayFresh();
  const allCities = sortCitiesForAddModal(
    applyCityOverlayToCatalogCities(catalog.allCities, overlay, country, q)
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
