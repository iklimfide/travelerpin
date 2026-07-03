import {
  countHubMediaItems,
  createHubTravelerPin,
  expandHubPinGalleryItems,
  pinHasGalleryMedia,
  sortHubTravelerPins,
  type HubGalleryItem,
  type HubTravelerPin,
} from "@/lib/supabase/hub-traveler-pin";
import { profilePath } from "@/lib/seo/site";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import type { VisitedCity, VisitedPark } from "@/types/database";

type ProfileIdentity = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  instagram_url?: string | null;
};

function cityToProfilePin(city: VisitedCity, profile: ProfileIdentity): HubTravelerPin {
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

function parkToProfilePin(park: VisitedPark, profile: ProfileIdentity): HubTravelerPin {
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

export const PROFILE_MEDIA_PREVIEW_LIMIT = 6;
export const PROFILE_MEDIA_PAGE_SIZE = 48;

export type ProfilePinRef =
  | { kind: "city"; id: string }
  | { kind: "park"; id: string };

export function parseProfilePinId(pinId: string): ProfilePinRef | null {
  if (pinId.startsWith("city:")) return { kind: "city", id: pinId.slice(5) };
  if (pinId.startsWith("park:")) return { kind: "park", id: pinId.slice(5) };
  return null;
}

export function expandProfileMediaItems(pins: HubTravelerPin[]): HubGalleryItem[] {
  return expandHubPinGalleryItems(pins);
}

export function countProfileMediaItems(pins: HubTravelerPin[]) {
  return countHubMediaItems(pins);
}

export function splitProfileMediaItems(pins: HubTravelerPin[]) {
  const items = expandProfileMediaItems(pins);
  return {
    photos: items.filter((item) => item.mediaType === "photo"),
    instagram: items.filter((item) => item.mediaType === "instagram"),
  };
}

/** All photo / Instagram items across a profile's city and park pins. */
export function buildProfileMediaPins(
  cities: VisitedCity[],
  parks: VisitedPark[],
  profile: ProfileIdentity
): HubTravelerPin[] {
  const pins = [
    ...cities.map((city) => cityToProfilePin(city, profile)),
    ...parks.map((park) => parkToProfilePin(park, profile)),
  ].filter((pin) => pinHasGalleryMedia(pin));

  return sortHubTravelerPins(pins);
}
