import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  computeTravelStats,
  getVisitedCountryCodes,
} from "@/lib/utils/stats";
import type { VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";

export async function GET() {
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

  const [{ data: countries }, { data: cities }, { data: parks }, { data: wishlist }] =
    await Promise.all([
    supabase
      .from("visited_countries")
      .select("id, country_code, country_name")
      .eq("user_id", user.id),
    supabase
      .from("visited_cities")
      .select("id, city_name, country_code, country_name")
      .eq("user_id", user.id),
    supabase
      .from("visited_parks")
      .select("id, park_name, park_type, country_code, country_name")
      .eq("user_id", user.id),
    supabase
      .from("wishlist_countries")
      .select("id, country_code, country_name")
      .eq("user_id", user.id),
  ]);

  const visitedCountries = (countries ?? []) as VisitedCountry[];
  const visitedCities = (cities ?? []) as VisitedCity[];
  const visitedParks = (parks ?? []) as VisitedPark[];
  const wishlistCountries = (wishlist ?? []) as WishlistCountry[];
  const stats = computeTravelStats(visitedCountries, visitedCities, visitedParks);
  const visitedCodes = getVisitedCountryCodes(visitedCountries, visitedCities, visitedParks);

  return NextResponse.json({
    visitedCountries,
    visitedCities,
    visitedParks,
    wishlistCountries,
    stats,
    visitedCodes,
  });
}
