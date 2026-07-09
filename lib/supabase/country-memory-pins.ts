import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchCityPinRowsByCountry } from "@/lib/supabase/city-pin-select";
import { fetchParkPinRows } from "@/lib/supabase/park-pin-select";
import { profilePath } from "@/lib/seo/site";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import type { MediaType } from "@/types/database";
import {
  type HubTravelerPin,
  createHubTravelerPin,
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
    instagram_url?: string | null;
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
    instagram_url?: string | null;
  } | null;
};

function cityRowToPin(row: CityPinRow): HubTravelerPin | null {
  const profile = row.profiles;
  if (!profile?.username || !row.city_name) return null;

  const username = profile.username.toLowerCase();

  return createHubTravelerPin({
    id: `city:${row.id}`,
    placeLabel: row.city_name,
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

function parkRowToPin(row: ParkPinRow): HubTravelerPin | null {
  const profile = row.profiles;
  if (!profile?.username) return null;

  const username = profile.username.toLowerCase();

  return createHubTravelerPin({
    id: `park:${row.id}`,
    placeLabel: row.park_name,
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

export async function fetchRecentCountryPins(
  supabase: SupabaseClient,
  countryCode: string,
  limit = 16
): Promise<HubTravelerPin[]> {
  const code = countryCode.toUpperCase();

  const [cityRows, parkRows] = await Promise.all([
    fetchCityPinRowsByCountry(supabase, code, 30),
    fetchParkPinRows(supabase, code, 30),
  ]);

  const cityPins = cityRows
    .map((row) => cityRowToPin({ ...row, city_name: row.city_name ?? "", visit_dates: row.visit_dates ?? [] }))
    .filter((pin): pin is HubTravelerPin => pin !== null);

  const parkPins = parkRows
    .map((row) =>
      parkRowToPin({
        id: row.id,
        park_name: row.park_name,
        note: row.note,
        photo_url: row.photo_url,
        instagram_urls: row.instagram_urls,
        media_type: row.media_type,
        media_url: row.media_url,
        visit_dates: row.visit_dates ?? [],
        updated_at: row.updated_at,
        profiles: row.profiles,
      })
    )
    .filter((pin): pin is HubTravelerPin => pin !== null);

  return pinsWithContent(sortHubTravelerPins([...cityPins, ...parkPins])).slice(0, limit);
}
