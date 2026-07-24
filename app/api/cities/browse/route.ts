import { NextResponse } from "next/server";
import { listModalBrowseCities } from "@/lib/data/country-page-cities";
import { getCatalogOverlayFresh } from "@/lib/kamikaze/catalog-overlay";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "40", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 80) : 40;

  const overlay = await getCatalogOverlayFresh();
  const cities = listModalBrowseCities(overlay, limit).map((city) => ({
    countryCode: city.countryCode,
    name: city.name,
  }));

  return NextResponse.json(
    { cities },
    { headers: { "Cache-Control": "no-store" } }
  );
}
