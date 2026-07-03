import type { SupabaseClient } from "@supabase/supabase-js";
import type { CountryHub } from "@/lib/data/country-hubs";
import {
  GUEST_COUNTRY_VISITOR_STATE,
  type CountryVisitorState,
} from "@/lib/data/country-visitor-state";
import { createHubTravelerPin, type HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
import { profilePath } from "@/lib/seo/site";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

export type CountryPageUserState = {
  visitorState: CountryVisitorState;
  ownerCity: VisitedCity | null;
  ownerPark: VisitedPark | null;
  ownerHubPin: HubTravelerPin | null;
  editOwnerCity: VisitedCity | null;
  editOwnerPark: VisitedPark | null;
  visitedCountries: VisitedCountry[];
};

type OwnerProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  instagram_url?: string | null;
};

function hubPinFromCity(city: VisitedCity, profile: OwnerProfile): HubTravelerPin {
  const username = profile.username.toLowerCase();

  return createHubTravelerPin({
    id: `city:${city.id}`,
    placeLabel: city.city_name,
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

function hubPinFromPark(park: VisitedPark, profile: OwnerProfile): HubTravelerPin {
  const username = profile.username.toLowerCase();

  return createHubTravelerPin({
    id: `park:${park.id}`,
    placeLabel: park.park_name,
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

export async function loadCountryPageUserState(
  supabase: SupabaseClient | null,
  userId: string | undefined,
  hub: CountryHub
): Promise<CountryPageUserState> {
  if (!supabase || !userId) {
    return {
      visitorState: GUEST_COUNTRY_VISITOR_STATE,
      ownerCity: null,
      ownerPark: null,
      ownerHubPin: null,
      editOwnerCity: null,
      editOwnerPark: null,
      visitedCountries: [],
    };
  }

  const code = hub.code.toUpperCase();

  const [
    { data: visited },
    { data: wishlist },
    { count: cityCount },
    { count: parkCount },
    { data: cities },
    { data: parks },
    { data: countries },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("visited_countries")
      .select("id")
      .eq("user_id", userId)
      .eq("country_code", code)
      .maybeSingle(),
    supabase
      .from("wishlist_countries")
      .select("id")
      .eq("user_id", userId)
      .eq("country_code", code)
      .maybeSingle(),
    supabase
      .from("visited_cities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("country_code", code),
    supabase
      .from("visited_parks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("country_code", code),
    supabase
      .from("visited_cities")
      .select("*")
      .eq("user_id", userId)
      .eq("country_code", code)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("visited_parks")
      .select("*")
      .eq("user_id", userId)
      .eq("country_code", code)
      .order("updated_at", { ascending: false })
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

  const ownerCity = (cities?.[0] as VisitedCity | undefined) ?? null;
  const ownerPark = (parks?.[0] as VisitedPark | undefined) ?? null;

  let ownerHubPin: HubTravelerPin | null = null;
  if (profile?.username) {
    const cityPin = ownerCity ? hubPinFromCity(ownerCity, profile) : null;
    const parkPin = ownerPark ? hubPinFromPark(ownerPark, profile) : null;

    if (cityPin && parkPin) {
      ownerHubPin = cityPin.pinnedAt >= parkPin.pinnedAt ? cityPin : parkPin;
    } else {
      ownerHubPin = cityPin ?? parkPin;
    }
  }

  const editOwnerCity =
    ownerHubPin?.id.startsWith("city:") && ownerCity ? ownerCity : null;
  const editOwnerPark =
    ownerHubPin?.id.startsWith("park:") && ownerPark ? ownerPark : null;

  const visitedId = visited?.id ?? null;
  const hasPlaces = (cityCount ?? 0) > 0 || (parkCount ?? 0) > 0;
  const isOnMap = Boolean(visitedId) || hasPlaces;

  return {
    visitorState: {
      isLoggedIn: true,
      visitedId,
      wishlistId: wishlist?.id ?? null,
      isOnMap,
      visitedViaPlacesOnly: isOnMap && !visitedId,
    },
    ownerCity,
    ownerPark,
    ownerHubPin,
    editOwnerCity,
    editOwnerPark,
    visitedCountries: (countries ?? []) as VisitedCountry[],
  };
}

export async function getCountryVisitorState(
  supabase: SupabaseClient,
  userId: string,
  hub: CountryHub
): Promise<CountryVisitorState> {
  const code = hub.code.toUpperCase();

  const [
    { data: visited },
    { data: wishlist },
    { count: cityCount },
    { count: parkCount },
  ] = await Promise.all([
    supabase
      .from("visited_countries")
      .select("id")
      .eq("user_id", userId)
      .eq("country_code", code)
      .maybeSingle(),
    supabase
      .from("wishlist_countries")
      .select("id")
      .eq("user_id", userId)
      .eq("country_code", code)
      .maybeSingle(),
    supabase
      .from("visited_cities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("country_code", code),
    supabase
      .from("visited_parks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("country_code", code),
  ]);

  const visitedId = visited?.id ?? null;
  const hasPlaces = (cityCount ?? 0) > 0 || (parkCount ?? 0) > 0;
  const isOnMap = Boolean(visitedId) || hasPlaces;

  return {
    isLoggedIn: true,
    visitedId,
    wishlistId: wishlist?.id ?? null,
    isOnMap,
    visitedViaPlacesOnly: isOnMap && !visitedId,
  };
}

export async function loadCountryVisitorState(
  supabase: SupabaseClient | null,
  userId: string | undefined,
  hub: CountryHub
): Promise<CountryVisitorState> {
  const { visitorState } = await loadCountryPageUserState(supabase, userId, hub);
  return visitorState;
}
