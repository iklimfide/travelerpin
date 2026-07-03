import { NextResponse } from "next/server";
import { buildTravelUpdateImage } from "@/lib/seo/travel-update-image";
import { loadTravelUpdateCardAssets } from "@/lib/seo/travel-update-card-assets";
import { getOgAssetOriginFromRequest } from "@/lib/seo/og-asset-origin";
import { buildProfileDescription } from "@/lib/seo/profile";
import { createClient } from "@/lib/supabase/server";
import { fetchTravelShareSnapshot } from "@/lib/supabase/travel-share-snapshot";
import {
  computeTravelStats,
  getVisitedCountryCodes,
} from "@/lib/utils/stats";
import { computeTravelUpdateDelta } from "@/lib/utils/travel-update";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

export const runtime = "edge";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "story" ? "story" : "square";

  const [{ data: countries }, { data: cities }, { data: parks }, snapshot, { data: profile }] =
    await Promise.all([
      supabase.from("visited_countries").select("*").eq("user_id", user.id),
      supabase.from("visited_cities").select("*").eq("user_id", user.id),
      supabase.from("visited_parks").select("*").eq("user_id", user.id),
      fetchTravelShareSnapshot(supabase, user.id),
      supabase
        .from("profiles")
        .select("display_name, avatar_url, cover_url, username, bio, residence")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  const visitedCountries = (countries ?? []) as VisitedCountry[];
  const visitedCities = (cities ?? []) as VisitedCity[];
  const visitedParks = (parks ?? []) as VisitedPark[];
  const stats = computeTravelStats(visitedCountries, visitedCities, visitedParks);
  const visitedCodes = getVisitedCountryCodes(
    visitedCountries,
    visitedCities,
    visitedParks
  );

  const delta = computeTravelUpdateDelta(
    snapshot,
    stats,
    visitedCodes,
    visitedCountries,
    visitedCities,
    visitedParks
  );

  const displayName = resolveProfileDisplayName(
    profile?.display_name ?? null,
    profile?.username ?? "traveler"
  );
  const bio =
    profile?.bio?.trim() ||
    buildProfileDescription(displayName, stats);
  const { avatarUrl, coverUrl } = await loadTravelUpdateCardAssets({
    assetOrigin: getOgAssetOriginFromRequest(request),
    avatarSource: profile?.avatar_url ?? null,
    coverSource: profile?.cover_url ?? null,
  });

  const response = await buildTravelUpdateImage({
    displayName,
    avatarUrl,
    delta,
    visitedCountryCodes: visitedCodes,
    visitedCities,
    format,
    bio,
    residence: profile?.residence ?? null,
    coverUrl,
    isOwnProfile: true,
  });

  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set(
    "Content-Disposition",
    `attachment; filename="travelerpin-update-${format}.png"`
  );
  return response;
}
