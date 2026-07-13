import { NextResponse } from "next/server";
import { getCityCatalog } from "@/lib/add/city-catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.toUpperCase();
  const q = searchParams.get("q")?.trim() ?? "";

  if (!country || country.length !== 2) {
    return NextResponse.json({ error: "Country is required" }, { status: 400 });
  }

  const catalog = getCityCatalog(country, q);
  return NextResponse.json({ cities: catalog.allCities, tiers: catalog.tiers });
}
