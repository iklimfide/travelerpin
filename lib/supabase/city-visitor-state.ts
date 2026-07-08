import type { SupabaseClient } from "@supabase/supabase-js";
import type { CityHub } from "@/lib/data/city-hubs";
import {
  GUEST_VISITOR_STATE,
  type CityVisitorState,
} from "@/lib/data/city-visitor-state";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
import { visitedCityToHubPin } from "@/lib/supabase/city-travelers";
import type { VisitedCity, VisitedCountry } from "@/types/database";

export type CityPageUserState = {
  visitorState: CityVisitorState;
  ownerCity: VisitedCity | null;
  ownerHubPin: HubTravelerPin | null;
  visitedCountries: VisitedCountry[];
};

export async function loadCityPageUserState(
  supabase: SupabaseClient | null,
  userId: string | undefined,
  hub: CityHub
): Promise<CityPageUserState> {
  if (!supabase || !userId) {
    return {
      visitorState: GUEST_VISITOR_STATE,
      ownerCity: null,
      ownerHubPin: null,
      visitedCountries: [],
    };
  }

  const code = hub.countryCode.toUpperCase();
  const cityName = hub.name.trim();

  const [{ data: cities }, { data: wishlist }, { data: country }, { data: countries }, { data: profile }] =
    await Promise.all([
      supabase
        .from("visited_cities")
        .select("*")
        .eq("user_id", userId)
        .eq("country_code", code)
        .ilike("city_name", cityName)
        .limit(1),
      supabase
        .from("wishlist_countries")
        .select("id")
        .eq("user_id", userId)
        .eq("country_code", code)
        .maybeSingle(),
      supabase
        .from("visited_countries")
        .select("id")
        .eq("user_id", userId)
        .eq("country_code", code)
        .maybeSingle(),
      supabase
        .from("visited_countries")
        .select("id, country_code, country_name")
        .eq("user_id", userId)
        .order("country_name", { ascending: true }),
      supabase
        .from("profiles")
        .select("username, display_name, avatar_url, instagram_url")
        .eq("id", userId)
        .maybeSingle(),
    ]);

  const ownerCity = (cities?.[0] as VisitedCity | undefined) ?? null;
  const ownerHubPin =
    ownerCity && profile?.username ? visitedCityToHubPin(ownerCity, hub, profile) : null;

  return {
    visitorState: {
      isLoggedIn: true,
      cityId: ownerCity?.id ?? null,
      countryWishlistId: wishlist?.id ?? null,
      countryVisited: Boolean(country) || Boolean(ownerCity),
    },
    ownerCity,
    ownerHubPin,
    visitedCountries: (countries ?? []) as VisitedCountry[],
  };
}

export async function getCityVisitorState(
  supabase: SupabaseClient,
  userId: string,
  hub: CityHub
): Promise<CityVisitorState> {
  const code = hub.countryCode.toUpperCase();

  const [{ data: city }, { data: wishlist }, { data: country }] = await Promise.all([
    supabase
      .from("visited_cities")
      .select("id")
      .eq("user_id", userId)
      .eq("country_code", code)
      .ilike("city_name", hub.name.trim())
      .maybeSingle(),
    supabase
      .from("wishlist_countries")
      .select("id")
      .eq("user_id", userId)
      .eq("country_code", code)
      .maybeSingle(),
    supabase
      .from("visited_countries")
      .select("id")
      .eq("user_id", userId)
      .eq("country_code", code)
      .maybeSingle(),
  ]);

  return {
    isLoggedIn: true,
    cityId: city?.id ?? null,
    countryWishlistId: wishlist?.id ?? null,
    countryVisited: Boolean(country) || Boolean(city),
  };
}

export async function loadCityVisitorState(
  supabase: SupabaseClient | null,
  userId: string | undefined,
  hub: CityHub
): Promise<CityVisitorState> {
  const { visitorState } = await loadCityPageUserState(supabase, userId, hub);
  return visitorState;
}
