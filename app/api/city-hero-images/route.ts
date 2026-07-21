import { NextResponse } from "next/server";
import {
  getCachedCityHeroImageMap,
  serializeCityHeroImageMap,
  type CityHeroImageRow,
} from "@/lib/city/city-hero-images";

export async function GET() {
  const heroMap = await getCachedCityHeroImageMap();
  return NextResponse.json({
    images: serializeCityHeroImageMap(heroMap),
  });
}

export type { CityHeroImageRow };
