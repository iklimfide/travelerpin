import type { SupabaseClient } from "@supabase/supabase-js";
import { profilePath } from "@/lib/seo/site";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import type { MediaType } from "@/types/database";
import {
  type HubTravelerPin,
  buildHubTravelerPinMedia,
  pinsWithContent,
  sortHubTravelerPins,
} from "@/lib/supabase/hub-traveler-pin";

type CityPinRow = {
  id: string;
  city_name: string;
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

type ParkPinRow = {
  id: string;
  park_name: string;
  note: string | null;
  photo_url?: string | null;
  instagram_urls?: string[] | null;
  media_type: MediaType | null;
  media_url: string | null;
  visit_dates: string[] | null;
  updated_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

function cityRowToPin(row: CityPinRow): HubTravelerPin | null {
  const profile = row.profiles;
  if (!profile?.username) return null;

  const username = profile.username.toLowerCase();
  const media = buildHubTravelerPinMedia(row);

  return {
    id: `city:${row.id}`,
    placeLabel: row.city_name,
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

function parkRowToPin(row: ParkPinRow): HubTravelerPin | null {
  const profile = row.profiles;
  if (!profile?.username) return null;

  const username = profile.username.toLowerCase();
  const media = buildHubTravelerPinMedia(row);

  return {
    id: `park:${row.id}`,
    placeLabel: row.park_name,
    note: row.note,
    photoUrl: media.photoUrl,
    instagramUrls: media.instagramUrls,
    mediaType: media.mediaType,
    mediaUrl: media.mediaUrl,
    mediaDisplayUrl: media.mediaDisplayUrl,
    mediaPreviewUrl: media.mediaPreviewUrl,
    visitDates: row.visit_dates ?? [],
    pinnedAt: row.updated_at,
    username,
    displayName: resolveProfileDisplayName(profile.display_name, profile.username),
    avatarUrl: profile.avatar_url,
    profilePath: profilePath(username),
  };
}

export async function fetchRecentCountryPins(
  supabase: SupabaseClient,
  countryCode: string,
  limit = 16
): Promise<HubTravelerPin[]> {
  const code = countryCode.toUpperCase();

  const [citiesResult, parksResult] = await Promise.all([
    supabase
      .from("visited_cities")
      .select(
        "id, city_name, note, media_type, media_url, media_preview_url, photo_url, instagram_urls, visit_dates, updated_at, profiles!inner(username, display_name, avatar_url)"
      )
      .eq("country_code", code)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("visited_parks")
      .select(
        "id, park_name, note, media_type, media_url, photo_url, instagram_urls, visit_dates, updated_at, profiles!inner(username, display_name, avatar_url)"
      )
      .eq("country_code", code)
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  const cityPins = ((citiesResult.data as CityPinRow[] | null) ?? [])
    .map(cityRowToPin)
    .filter((pin): pin is HubTravelerPin => pin !== null);

  const parkPins = ((parksResult.data as ParkPinRow[] | null) ?? [])
    .map(parkRowToPin)
    .filter((pin): pin is HubTravelerPin => pin !== null);

  return pinsWithContent(sortHubTravelerPins([...cityPins, ...parkPins])).slice(0, limit);
}
