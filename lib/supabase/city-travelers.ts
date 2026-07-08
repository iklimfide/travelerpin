import type { SupabaseClient } from "@supabase/supabase-js";
import type { CityHub } from "@/lib/data/city-hubs";
import { fetchCityPinRowsForHub, type CityPinQueryRow } from "@/lib/supabase/city-pin-select";
import { profilePath } from "@/lib/seo/site";
import { normalizeCityKey } from "@/lib/utils/city-name";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import type { MediaType, VisitedCity } from "@/types/database";
import {
  type CityTravelerPin,
  type HubTravelerPin,
  createHubTravelerPin,
  pinsWithContent,
  sortHubTravelerPins,
  uniqueHubTravelers,
} from "@/lib/supabase/hub-traveler-pin";

export type { CityTravelerPin, HubTravelerPin };

type CityPinRow = CityPinQueryRow;

function rowToPin(row: CityPinRow): HubTravelerPin | null {
  const profile = row.profiles;
  if (!profile?.username) return null;

  const username = profile.username.toLowerCase();

  return createHubTravelerPin({
    id: row.id,
    placeLabel: null,
    note: row.note,
    mediaRow: row,
    mediaPreviewUrl: row.media_preview_url,
    visitDates: row.visit_dates ?? [],
    pinnedAt: row.updated_at,
    username,
    displayName: resolveProfileDisplayName(profile.display_name, profile.username),
    avatarUrl: profile.avatar_url,
    instagramProfileUrl: profile.instagram_url ?? null,
    profilePath: profilePath(username),
  });
}

type OwnerProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  instagram_url?: string | null;
};

export function visitedCityToHubPin(
  city: VisitedCity,
  hub: CityHub,
  profile: OwnerProfile
): HubTravelerPin | null {
  if (city.country_code.toUpperCase() !== hub.countryCode.toUpperCase()) return null;
  if (normalizeCityKey(city.city_name) !== normalizeCityKey(hub.name)) return null;
  if (!profile.username) return null;

  const username = profile.username.toLowerCase();

  return createHubTravelerPin({
    id: city.id,
    placeLabel: null,
    note: city.note,
    mediaRow: city,
    mediaPreviewUrl: city.media_preview_url,
    visitDates: city.visit_dates ?? [],
    pinnedAt: city.updated_at,
    username,
    displayName: resolveProfileDisplayName(profile.display_name, profile.username),
    avatarUrl: profile.avatar_url,
    instagramProfileUrl: profile.instagram_url ?? null,
    profilePath: profilePath(username),
  });
}

export async function fetchRecentCityPins(
  supabase: SupabaseClient,
  hub: CityHub,
  limit = 12
): Promise<HubTravelerPin[]> {
  const rows = await fetchCityPinRowsForHub(supabase, hub, 40);

  const pins = rows
    .map(rowToPin)
    .filter((pin): pin is HubTravelerPin => pin !== null);

  return sortHubTravelerPins(pins).slice(0, limit);
}

import { unstable_cache } from "next/cache";
import { cityPinsCacheTag } from "@/lib/cache/revalidate-city-hub";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

async function readCityPinnerCount(hub: CityHub): Promise<number> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from("published_hubs")
    .select("pinner_count")
    .eq("hub_kind", "city")
    .eq("slug", hub.slug.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("published_hubs pinner_count lookup failed:", error.message);
    return 0;
  }

  if (data?.pinner_count != null) {
    return data.pinner_count;
  }

  const { count } = await supabase
    .from("visited_cities")
    .select("user_id", { count: "exact", head: true })
    .eq("country_code", hub.countryCode.toUpperCase())
    .ilike("city_name", hub.name.trim());

  return count ?? 0;
}

/** Cached city hub pinner total — invalidated when a pin changes in that city. */
export function getCachedCityPinnerCount(hub: CityHub): Promise<number> {
  return unstable_cache(
    () => readCityPinnerCount(hub),
    ["city-pinner-count", hub.slug],
    { revalidate: false, tags: [cityPinsCacheTag(hub.countryCode, hub.name)] }
  )();
}

export async function countCityPinners(
  _supabase: SupabaseClient | null,
  hub: CityHub
): Promise<number> {
  return getCachedCityPinnerCount(hub);
}

export { pinsWithContent as cityPinsWithContent, uniqueHubTravelers as uniqueCityTravelers };
