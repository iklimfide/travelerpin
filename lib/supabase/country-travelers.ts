import type { SupabaseClient } from "@supabase/supabase-js";
import { profilePath } from "@/lib/seo/site";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";

export type CountryTraveler = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  lastPinnedAt: string;
  profilePath: string;
};

type CountryVisitRow = {
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type PinTimeRow = {
  user_id: string;
  created_at: string;
};

const PROFILE_IN_CHUNK = 100;
const PIN_TIME_ROW_LIMIT = 1000;

function travelerFromProfile(
  userId: string,
  profile: { username: string; display_name: string | null; avatar_url: string | null },
  lastPinnedAt: string
): CountryTraveler {
  const username = profile.username.toLowerCase();
  return {
    username,
    displayName: resolveProfileDisplayName(profile.display_name, profile.username),
    avatarUrl: profile.avatar_url,
    lastPinnedAt,
    profilePath: profilePath(username),
  };
}

function sortTravelers(travelers: CountryTraveler[]): CountryTraveler[] {
  return [...travelers].sort((a, b) => {
    if (a.lastPinnedAt && b.lastPinnedAt) return b.lastPinnedAt.localeCompare(a.lastPinnedAt);
    if (a.lastPinnedAt) return -1;
    if (b.lastPinnedAt) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

function applyLimit(travelers: CountryTraveler[], limit?: number): CountryTraveler[] {
  if (limit == null || limit <= 0) return travelers;
  return travelers.slice(0, limit);
}

async function fetchProfilesByIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<ProfileRow[]> {
  const profiles: ProfileRow[] = [];

  for (let index = 0; index < userIds.length; index += PROFILE_IN_CHUNK) {
    const chunk = userIds.slice(index, index + PROFILE_IN_CHUNK);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", chunk);

    if (error) {
      console.error("country traveler profiles lookup failed:", error.message);
      continue;
    }

    profiles.push(...((data ?? []) as ProfileRow[]));
  }

  return profiles;
}

function ingestPinTimes(target: Map<string, string>, rows: PinTimeRow[] | null) {
  for (const row of rows ?? []) {
    const existing = target.get(row.user_id);
    if (!existing || row.created_at > existing) {
      target.set(row.user_id, row.created_at);
    }
  }
}

async function fetchLatestPinTimes(
  supabase: SupabaseClient,
  countryCode: string
): Promise<Map<string, string>> {
  const latest = new Map<string, string>();
  const [{ data: countryRows }, { data: cityRows }, { data: parkRows }] = await Promise.all([
    supabase
      .from("visited_countries")
      .select("user_id, created_at")
      .eq("country_code", countryCode)
      .order("created_at", { ascending: false })
      .limit(PIN_TIME_ROW_LIMIT),
    supabase
      .from("visited_cities")
      .select("user_id, created_at")
      .eq("country_code", countryCode)
      .order("created_at", { ascending: false })
      .limit(PIN_TIME_ROW_LIMIT),
    supabase
      .from("visited_parks")
      .select("user_id, created_at")
      .eq("country_code", countryCode)
      .order("created_at", { ascending: false })
      .limit(PIN_TIME_ROW_LIMIT),
  ]);

  ingestPinTimes(latest, countryRows as PinTimeRow[] | null);
  ingestPinTimes(latest, cityRows as PinTimeRow[] | null);
  ingestPinTimes(latest, parkRows as PinTimeRow[] | null);
  return latest;
}

function ingestVisitRows(
  latestByUser: Map<string, CountryTraveler>,
  rows: CountryVisitRow[] | null
) {
  for (const row of rows ?? []) {
    const profile = row.profiles;
    if (!profile?.username) continue;

    const existing = latestByUser.get(row.user_id);
    if (existing && existing.lastPinnedAt >= row.created_at) continue;

    latestByUser.set(row.user_id, travelerFromProfile(row.user_id, profile, row.created_at));
  }
}

async function fetchTravelersFromVisitedRows(
  supabase: SupabaseClient,
  countryCode: string
): Promise<CountryTraveler[]> {
  const [{ data: countryRows }, { data: cityRows }, { data: parkRows }] = await Promise.all([
    supabase
      .from("visited_countries")
      .select("user_id, created_at, profiles!inner(username, display_name, avatar_url)")
      .eq("country_code", countryCode)
      .order("created_at", { ascending: false })
      .limit(PIN_TIME_ROW_LIMIT),
    supabase
      .from("visited_cities")
      .select("user_id, created_at, profiles!inner(username, display_name, avatar_url)")
      .eq("country_code", countryCode)
      .order("created_at", { ascending: false })
      .limit(PIN_TIME_ROW_LIMIT),
    supabase
      .from("visited_parks")
      .select("user_id, created_at, profiles!inner(username, display_name, avatar_url)")
      .eq("country_code", countryCode)
      .order("created_at", { ascending: false })
      .limit(PIN_TIME_ROW_LIMIT),
  ]);

  const latestByUser = new Map<string, CountryTraveler>();
  ingestVisitRows(latestByUser, countryRows as CountryVisitRow[] | null);
  ingestVisitRows(latestByUser, cityRows as CountryVisitRow[] | null);
  ingestVisitRows(latestByUser, parkRows as CountryVisitRow[] | null);
  return sortTravelers([...latestByUser.values()]);
}

export async function fetchRecentCountryTravelers(
  supabase: SupabaseClient,
  countryCode: string,
  limit?: number
): Promise<CountryTraveler[]> {
  const code = countryCode.toUpperCase();

  const { data: pinnerRows, error: pinnersError } = await supabase
    .from("country_pinners")
    .select("user_id")
    .eq("country_code", code);

  if (pinnersError) {
    console.error("country_pinners lookup failed:", pinnersError.message);
    return applyLimit(await fetchTravelersFromVisitedRows(supabase, code), limit);
  }

  const userIds = [...new Set((pinnerRows ?? []).map((row) => row.user_id).filter(Boolean))];
  if (userIds.length === 0) {
    return applyLimit(await fetchTravelersFromVisitedRows(supabase, code), limit);
  }

  const [profiles, pinTimes] = await Promise.all([
    fetchProfilesByIds(supabase, userIds),
    fetchLatestPinTimes(supabase, code),
  ]);

  const travelers: CountryTraveler[] = [];
  for (const profile of profiles) {
    if (!profile.username) continue;
    travelers.push(
      travelerFromProfile(profile.id, profile, pinTimes.get(profile.id) ?? "")
    );
  }

  if (travelers.length === 0) {
    return applyLimit(await fetchTravelersFromVisitedRows(supabase, code), limit);
  }

  return applyLimit(sortTravelers(travelers), limit);
}
