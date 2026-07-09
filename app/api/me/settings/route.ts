import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileSettings } from "@/lib/supabase/profile-settings";
import { safeGetUser } from "@/lib/supabase/safe-server";
import { computeTravelStats } from "@/lib/utils/stats";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }

    const user = await safeGetUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await fetchProfileSettings(supabase, user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const [{ data: countries }, { data: cities }, { data: parks }] = await Promise.all([
      supabase.from("visited_countries").select("country_code").eq("user_id", user.id),
      supabase
        .from("visited_cities")
        .select("country_code, visit_dates")
        .eq("user_id", user.id),
      supabase.from("visited_parks").select("country_code, park_type").eq("user_id", user.id),
    ]);

    const stats = computeTravelStats(
      (countries ?? []) as VisitedCountry[],
      (cities ?? []) as VisitedCity[],
      (parks ?? []) as VisitedPark[]
    );

    return NextResponse.json({ profile, stats });
  } catch (error) {
    console.error("settings GET failed:", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
