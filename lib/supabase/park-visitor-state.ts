import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParkHub } from "@/lib/data/park-hubs";
import { GUEST_PARK_VISITOR_STATE, type ParkVisitorState } from "@/lib/data/park-visitor-state";
import { parkPinMatchesHub } from "@/lib/utils/park-hub-match";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
import { visitedParkToHubPin } from "@/lib/supabase/park-travelers";
import type { VisitedCountry, VisitedPark } from "@/types/database";

export type ParkPageUserState = {
  visitorState: ParkVisitorState;
  ownerPark: VisitedPark | null;
  ownerHubPin: HubTravelerPin | null;
  visitedCountries: VisitedCountry[];
};

export async function loadParkPageUserState(
  supabase: SupabaseClient | null,
  userId: string | undefined,
  hub: ParkHub
): Promise<ParkPageUserState> {
  if (!supabase || !userId) {
    return {
      visitorState: GUEST_PARK_VISITOR_STATE,
      ownerPark: null,
      ownerHubPin: null,
      visitedCountries: [],
    };
  }

  const code = hub.countryCode.toUpperCase();

  const [{ data: parks }, { data: wishlist }, { data: visitedCountries }, { data: countries }, { data: profile }] =
    await Promise.all([
      supabase
        .from("visited_parks")
        .select("*")
        .eq("user_id", userId)
        .eq("country_code", code)
        .order("updated_at", { ascending: false })
        .limit(50),
      supabase
        .from("wishlist_countries")
        .select("id")
        .eq("user_id", userId)
        .eq("country_code", code)
        .limit(1),
      supabase
        .from("visited_countries")
        .select("id")
        .eq("user_id", userId)
        .eq("country_code", code)
        .limit(1),
      supabase
        .from("visited_countries")
        .select("*")
        .eq("user_id", userId)
        .order("country_name", { ascending: true }),
      supabase
        .from("profiles")
        .select("username, display_name, avatar_url, instagram_url")
        .eq("id", userId)
        .maybeSingle(),
    ]);

  const matchedPark = (parks ?? []).find((park) =>
    parkPinMatchesHub(park.park_name, park.country_code, hub)
  );
  const ownerPark = (matchedPark as VisitedPark | undefined) ?? null;
  const ownerHubPin =
    ownerPark && profile?.username
      ? visitedParkToHubPin(ownerPark, hub, profile)
      : null;

  return {
    visitorState: {
      isLoggedIn: true,
      parkId: matchedPark?.id ?? null,
      countryWishlistId: wishlist?.[0]?.id ?? null,
      countryVisited: Boolean(visitedCountries?.[0]),
    },
    ownerPark,
    ownerHubPin,
    visitedCountries: (countries ?? []) as VisitedCountry[],
  };
}

export async function loadParkVisitorState(
  supabase: SupabaseClient | null,
  userId: string | undefined,
  hub: ParkHub
): Promise<ParkVisitorState> {
  const { visitorState } = await loadParkPageUserState(supabase, userId, hub);
  return visitorState;
}

export async function countParkPinners(
  supabase: SupabaseClient | null,
  hub: ParkHub
): Promise<number> {
  if (!supabase) return 0;

  const { data } = await supabase
    .from("visited_parks")
    .select("user_id, park_name, country_code")
    .eq("country_code", hub.countryCode.toUpperCase())
    .limit(200);

  const users = new Set<string>();

  for (const row of data ?? []) {
    if (!parkPinMatchesHub(row.park_name, row.country_code, hub)) continue;
    users.add(row.user_id);
  }

  return users.size;
}
