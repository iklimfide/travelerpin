import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParkHub } from "@/lib/data/park-hubs";
import { profilePath } from "@/lib/seo/site";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { parkPinMatchesHub } from "@/lib/utils/park-hub-match";
import type { VisitedPark } from "@/types/database";
import type { CountryTraveler } from "@/lib/supabase/country-travelers";
import {
  type HubTravelerPin,
  createHubTravelerPin,
  sortHubTravelerPins,
  uniqueHubTravelers,
} from "@/lib/supabase/hub-traveler-pin";
import { fetchParkPinRows, type ParkPinQueryRow } from "@/lib/supabase/park-pin-select";

type ParkPinRow = ParkPinQueryRow;

type ParkTravelerRow = {
  user_id: string;
  park_name: string;
  country_code: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

function rowToPin(row: ParkPinRow, hub: ParkHub): HubTravelerPin | null {
  if (!parkPinMatchesHub(row.park_name, row.country_code, hub)) return null;

  const profile = row.profiles;
  if (!profile?.username) return null;

  const username = profile.username.toLowerCase();

  return createHubTravelerPin({
    id: row.id,
    placeLabel: null,
    note: row.note,
    mediaRow: row,
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

export function visitedParkToHubPin(
  park: VisitedPark,
  hub: ParkHub,
  profile: OwnerProfile
): HubTravelerPin | null {
  if (!parkPinMatchesHub(park.park_name, park.country_code, hub)) return null;
  if (!profile.username) return null;

  const username = profile.username.toLowerCase();

  return createHubTravelerPin({
    id: park.id,
    placeLabel: null,
    note: park.note,
    mediaRow: park,
    visitDates: park.visit_dates ?? [],
    pinnedAt: park.updated_at,
    username,
    displayName: resolveProfileDisplayName(profile.display_name, profile.username),
    avatarUrl: profile.avatar_url,
    instagramProfileUrl: profile.instagram_url ?? null,
    profilePath: profilePath(username),
  });
}

export async function fetchRecentParkPins(
  supabase: SupabaseClient,
  hub: ParkHub,
  limit = 12
): Promise<HubTravelerPin[]> {
  const rows = await fetchParkPinRows(supabase, hub.countryCode, 60);

  const pins = rows
    .map((row) => rowToPin(row, hub))
    .filter((pin): pin is HubTravelerPin => pin !== null);

  return sortHubTravelerPins(pins).slice(0, limit);
}

export async function fetchRecentParkTravelers(
  supabase: SupabaseClient,
  hub: ParkHub,
  limit = 5
): Promise<CountryTraveler[]> {
  const code = hub.countryCode.toUpperCase();

  const { data } = await supabase
    .from("visited_parks")
    .select("user_id, park_name, country_code, created_at, profiles!inner(username, display_name, avatar_url)")
    .eq("country_code", code)
    .order("created_at", { ascending: false })
    .limit(200);

  const latestByUser = new Map<string, CountryTraveler>();

  for (const row of (data as ParkTravelerRow[] | null) ?? []) {
    if (!parkPinMatchesHub(row.park_name, row.country_code, hub)) continue;

    const profile = row.profiles;
    if (!profile?.username) continue;

    const username = profile.username.toLowerCase();
    const existing = latestByUser.get(row.user_id);
    if (existing && existing.lastPinnedAt >= row.created_at) continue;

    latestByUser.set(row.user_id, {
      username,
      displayName: resolveProfileDisplayName(profile.display_name, profile.username),
      avatarUrl: profile.avatar_url,
      lastPinnedAt: row.created_at,
      profilePath: profilePath(username),
    });
  }

  return [...latestByUser.values()]
    .sort((a, b) => b.lastPinnedAt.localeCompare(a.lastPinnedAt))
    .slice(0, limit);
}

export function uniqueParkTravelers(pins: HubTravelerPin[], limit = 5): CountryTraveler[] {
  return uniqueHubTravelers(pins, limit);
}
