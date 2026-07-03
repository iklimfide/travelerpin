import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchTravelShareSnapshot } from "@/lib/supabase/travel-share-snapshot";
import { computeTravelStats } from "@/lib/utils/stats";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { computeSharePromptDelta } from "@/lib/utils/travel-update";
import type { SharePromptMode, VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

function parseMode(value: unknown): SharePromptMode {
  if (value === "every_pin" || value === "after_30m" || value === "never") {
    return value;
  }
  return "every_pin";
}

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, share_prompt_mode")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.username) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const mode = parseMode(profile.share_prompt_mode);
  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);

  if (mode === "never") {
    return NextResponse.json({
      mode,
      shouldOffer: false,
      username: profile.username,
      displayName,
      delta: null,
    });
  }

  const [{ data: countries }, { data: cities }, { data: parks }, snapshot] =
    await Promise.all([
      supabase.from("visited_countries").select("*").eq("user_id", user.id),
      supabase.from("visited_cities").select("*").eq("user_id", user.id),
      supabase.from("visited_parks").select("*").eq("user_id", user.id),
      fetchTravelShareSnapshot(supabase, user.id),
    ]);

  const visitedCountries = (countries ?? []) as VisitedCountry[];
  const visitedCities = (cities ?? []) as VisitedCity[];
  const visitedParks = (parks ?? []) as VisitedPark[];
  const stats = computeTravelStats(visitedCountries, visitedCities, visitedParks);
  const visitedCountryCodes = visitedCountries.map((country) => country.country_code);
  const delta = computeSharePromptDelta(
    snapshot,
    stats,
    visitedCountryCodes,
    visitedCountries,
    visitedCities,
    visitedParks
  );

  // Offer as soon as the traveler has any city/park/country pin to share.
  const shouldOffer =
    stats.cities > 0 ||
    stats.nationalParks + stats.themeParks > 0 ||
    stats.countries > 0;

  return NextResponse.json({
    mode,
    shouldOffer,
    username: profile.username,
    displayName,
    delta: shouldOffer ? delta : null,
  });
}
