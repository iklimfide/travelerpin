import { NextResponse } from "next/server";
import {
  getCachedParkHeroImageMap,
  serializeParkHeroImageMap,
} from "@/lib/park/park-hero-images";

const HERO_IMAGES_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

export async function GET() {
  const heroMap = await getCachedParkHeroImageMap();
  return NextResponse.json(
    {
      images: serializeParkHeroImageMap(heroMap),
    },
    {
      headers: {
        "Cache-Control": HERO_IMAGES_CACHE_CONTROL,
      },
    }
  );
}