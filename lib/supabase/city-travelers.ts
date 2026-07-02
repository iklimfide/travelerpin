import type { SupabaseClient } from "@supabase/supabase-js";
import type { CityHub } from "@/lib/data/city-hubs";
import { profilePath } from "@/lib/seo/site";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import type { MediaType, VisitedCity } from "@/types/database";
import {
  type CityTravelerPin,
  type HubTravelerPin,
  buildHubTravelerPinMedia,
  pinsWithContent,
  sortHubTravelerPins,
  uniqueHubTravelers,
} from "@/lib/supabase/hub-traveler-pin";

export type { CityTravelerPin, HubTravelerPin };

type CityPinRow = {
  id: string;
  note: string | null;
  photo_url?: string | null;
  instagram_urls?: string[] | null;
  media_type: MediaType | null;
  media_url: string | null;
  media_preview_url: string | null;
  visit_dates: string[] | null;
  updated_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

function rowToPin(row: CityPinRow): HubTravelerPin | null {
  const profile = row.profiles;
  if (!profile?.username) return null;

  const username = profile.username.toLowerCase();
  const media = buildHubTravelerPinMedia(row);

  return {
    id: row.id,
    placeLabel: null,
    note: row.note,
    photoUrl: media.photoUrl,
    instagramUrls: media.instagramUrls,
    mediaType: media.mediaType,
    mediaUrl: media.mediaUrl,
    mediaDisplayUrl: media.mediaDisplayUrl,
    mediaPreviewUrl:
      row.media_preview_url ??
      media.mediaPreviewUrl,
    visitDates: row.visit_dates ?? [],
    pinnedAt: row.updated_at,
    username,
    displayName: resolveProfileDisplayName(profile.display_name, profile.username),
    avatarUrl: profile.avatar_url,
    profilePath: profilePath(username),
  };
}

type OwnerProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export function visitedCityToHubPin(
  city: VisitedCity,
  hub: CityHub,
  profile: OwnerProfile
): HubTravelerPin | null {
  if (city.country_code.toUpperCase() !== hub.countryCode.toUpperCase()) return null;
  if (city.city_name.trim().toLowerCase() !== hub.name.trim().toLowerCase()) return null;
  if (!profile.username) return null;

  const username = profile.username.toLowerCase();
  const media = buildHubTravelerPinMedia(city);

  return {
    id: city.id,
    placeLabel: null,
    note: city.note,
    photoUrl: media.photoUrl,
    instagramUrls: media.instagramUrls,
    mediaType: media.mediaType,
    mediaUrl: media.mediaUrl,
    mediaDisplayUrl: media.mediaDisplayUrl,
    mediaPreviewUrl: city.media_preview_url ?? media.mediaPreviewUrl,
    visitDates: city.visit_dates ?? [],
    pinnedAt: city.updated_at,
    username,
    displayName: resolveProfileDisplayName(profile.display_name, profile.username),
    avatarUrl: profile.avatar_url,
    profilePath: profilePath(username),
  };
}

export async function fetchRecentCityPins(
  supabase: SupabaseClient,
  hub: CityHub,
  limit = 12
): Promise<HubTravelerPin[]> {
  const code = hub.countryCode.toUpperCase();

  const { data } = await supabase
    .from("visited_cities")
    .select(
      "id, note, media_type, media_url, media_preview_url, photo_url, instagram_urls, visit_dates, updated_at, profiles!inner(username, display_name, avatar_url)"
    )
    .eq("country_code", code)
    .ilike("city_name", hub.name.trim())
    .order("updated_at", { ascending: false })
    .limit(40);

  const pins = ((data as CityPinRow[] | null) ?? [])
    .map(rowToPin)
    .filter((pin): pin is HubTravelerPin => pin !== null);

  return sortHubTravelerPins(pins).slice(0, limit);
}

export async function countCityPinners(
  supabase: SupabaseClient | null,
  hub: CityHub
): Promise<number> {
  if (!supabase) return 0;

  const { count } = await supabase
    .from("visited_cities")
    .select("user_id", { count: "exact", head: true })
    .eq("country_code", hub.countryCode.toUpperCase())
    .ilike("city_name", hub.name.trim());

  return count ?? 0;
}

export { pinsWithContent as cityPinsWithContent, uniqueHubTravelers as uniqueCityTravelers };
