import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countryPinsCacheTag } from "@/lib/cache/revalidate-country-hub";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { CountryTraveler } from "@/lib/supabase/country-travelers";
import { profilePath } from "@/lib/seo/site";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";

type WishlistTravelerRow = {
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

async function readCountryPinnerCount(countryCode: string): Promise<number> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return 0;

  const code = countryCode.toUpperCase();
  const { data, error } = await supabase
    .from("country_pinner_stats")
    .select("pinner_count")
    .eq("country_code", code)
    .maybeSingle();

  if (error) {
    console.error("country_pinner_stats lookup failed:", error.message);
    return 0;
  }

  return data?.pinner_count ?? 0;
}

/** Cached country pinner total — invalidated when a pin changes in that country. */
export function getCachedCountryPinnerCount(countryCode: string): Promise<number> {
  const code = countryCode.toUpperCase();
  return unstable_cache(
    () => readCountryPinnerCount(code),
    ["country-pinner-count", code],
    { revalidate: false, tags: [countryPinsCacheTag(code)] }
  )();
}

/** Read stored pinner count (no table scan). Prefer getCachedCountryPinnerCount on hub pages. */
export async function countCountryPinners(
  _supabase: SupabaseClient | null,
  countryCode: string
): Promise<number> {
  return getCachedCountryPinnerCount(countryCode);
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
