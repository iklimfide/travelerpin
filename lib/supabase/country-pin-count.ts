import type { SupabaseClient } from "@supabase/supabase-js";
import type { CountryTraveler } from "@/lib/supabase/country-travelers";
import { profilePath } from "@/lib/seo/site";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";

type UserIdRow = {
  user_id: string;
};

type WishlistTravelerRow = {
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export async function countCountryPinners(
  supabase: SupabaseClient | null,
  countryCode: string
): Promise<number> {
  if (!supabase) return 0;

  const code = countryCode.toUpperCase();
  const userIds = new Set<string>();

  const [{ data: countryRows }, { data: cityRows }, { data: parkRows }] = await Promise.all([
    supabase.from("visited_countries").select("user_id").eq("country_code", code),
    supabase.from("visited_cities").select("user_id").eq("country_code", code),
    supabase.from("visited_parks").select("user_id").eq("country_code", code),
  ]);

  for (const row of [
    ...(countryRows as UserIdRow[] | null ?? []),
    ...(cityRows as UserIdRow[] | null ?? []),
    ...(parkRows as UserIdRow[] | null ?? []),
  ]) {
    userIds.add(row.user_id);
  }

  return userIds.size;
}

export async function countCountryWishlisters(
  supabase: SupabaseClient | null,
  countryCode: string
): Promise<number> {
  if (!supabase) return 0;

  const { count } = await supabase
    .from("wishlist_countries")
    .select("user_id", { count: "exact", head: true })
    .eq("country_code", countryCode.toUpperCase());

  return count ?? 0;
}

/** Travelers who added this country to their wishlist (Want). */
export async function fetchRecentCountryWishlisters(
  supabase: SupabaseClient | null,
  countryCode: string,
  limit = 12
): Promise<CountryTraveler[]> {
  if (!supabase) return [];

  const { data } = await supabase
    .from("wishlist_countries")
    .select("user_id, created_at, profiles!inner(username, display_name, avatar_url)")
    .eq("country_code", countryCode.toUpperCase())
    .order("created_at", { ascending: false })
    .limit(limit);

  const travelers: CountryTraveler[] = [];

  for (const row of (data as WishlistTravelerRow[] | null) ?? []) {
    const profile = row.profiles;
    if (!profile?.username) continue;

    const username = profile.username.toLowerCase();
    travelers.push({
      username,
      displayName: resolveProfileDisplayName(profile.display_name, profile.username),
      avatarUrl: profile.avatar_url,
      lastPinnedAt: row.created_at,
      profilePath: profilePath(username),
    });
  }

  return travelers;
}
