import type { MediaType } from "@/types/database";
import type { CountryTraveler } from "@/lib/supabase/country-travelers";
import { toHubPhotoSrc } from "@/lib/storage/hub-photo-url";
import { readInstagramUrls, readPhotoUrl, readPhotoUrls, type PinMediaRow } from "@/lib/utils/pin-media";

export type HubTravelerPin = {
  id: string;
  placeLabel: string | null;
  placePath: string | null;
  note: string | null;
  photoUrl: string | null;
  photoUrls: string[];
  instagramUrls: string[];
  mediaType: MediaType | null;
  mediaUrl: string | null;
  /** Resolved on the server for stable SSR/hydration (e.g. /api/hub-photo proxy). */
  mediaDisplayUrl: string | null;
  mediaPreviewUrl: string | null;
  visitDates: string[];
  pinnedAt: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** Public Instagram profile URL from the traveler's settings, if any. */
  instagramProfileUrl: string | null;
  profilePath: string;
};

export type HubGalleryItem = {
  id: string;
  pin: HubTravelerPin;
  mediaType: "photo" | "instagram";
  mediaUrl: string;
  mediaDisplayUrl: string | null;
};

/** @deprecated Use HubTravelerPin */
export type CityTravelerPin = HubTravelerPin;

export function hubPhotoDisplayUrl(mediaUrl: string | null): string | null {
  return toHubPhotoSrc(mediaUrl);
}

/** Cached or legacy pins may omit `photoUrls`; derive from single-photo fields. */
export function pinPhotoUrls(pin: HubTravelerPin): string[] {
  if (Array.isArray(pin.photoUrls) && pin.photoUrls.length > 0) {
    return pin.photoUrls;
  }
  if (pin.photoUrl) return [pin.photoUrl];
  if (pin.mediaType === "photo" && pin.mediaUrl) return [pin.mediaUrl];
  return [];
}

export function pinInstagramUrls(pin: HubTravelerPin): string[] {
  if (Array.isArray(pin.instagramUrls) && pin.instagramUrls.length > 0) {
    return pin.instagramUrls;
  }
  if (pin.mediaType === "instagram" && pin.mediaUrl) return [pin.mediaUrl];
  return [];
}

export function normalizeHubTravelerPin(pin: HubTravelerPin): HubTravelerPin {
  const photoUrls = pinPhotoUrls(pin);
  const instagramUrls = pinInstagramUrls(pin);
  const photoUrl = photoUrls[0] ?? pin.photoUrl ?? null;

  if (
    pin.photoUrls === photoUrls &&
    pin.instagramUrls === instagramUrls &&
    pin.photoUrl === photoUrl
  ) {
    return pin;
  }

  return {
    ...pin,
    photoUrl,
    photoUrls,
    instagramUrls,
  };
}

export function buildHubTravelerPinMedia(row: PinMediaRow) {
  const photoUrls = readPhotoUrls(row);
  const photoUrl = photoUrls[0] ?? readPhotoUrl(row);
  const instagramUrls = readInstagramUrls(row);
  const mediaUrl = photoUrl ?? instagramUrls[0] ?? row.media_url ?? null;
  const mediaType: MediaType | null = photoUrl
    ? "photo"
    : instagramUrls.length > 0
      ? "instagram"
      : row.media_type ?? null;

  return {
    photoUrl,
    photoUrls,
    instagramUrls,
    mediaUrl,
    mediaType,
    mediaDisplayUrl: hubPhotoDisplayUrl(photoUrl),
    mediaPreviewUrl: photoUrl,
  };
}

type HubTravelerPinIdentity = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  instagramProfileUrl?: string | null;
  profilePath: string;
};

type HubTravelerPinInput = HubTravelerPinIdentity & {
  id: string;
  placeLabel: string | null;
  placePath?: string | null;
  note: string | null;
  visitDates?: string[];
  pinnedAt: string;
  mediaRow: PinMediaRow;
  mediaPreviewUrl?: string | null;
  /**
   * When true, pins without media fall back to the traveler avatar and Instagram
   * profile URL. Default is false so country/city/profile galleries only show
   * real pin photos — not one PP copy per city pin.
   */
  fillMissingMediaFromProfile?: boolean;
};

/**
 * Build a hub pin. Gallery media comes from the pin only unless
 * fillMissingMediaFromProfile is explicitly enabled.
 */
export function createHubTravelerPin(input: HubTravelerPinInput): HubTravelerPin {
  const media = buildHubTravelerPinMedia(input.mediaRow);
  const instagramProfileUrl = input.instagramProfileUrl ?? null;
  const fillFromProfile = input.fillMissingMediaFromProfile === true;

  const hasExplicitPhoto =
    media.photoUrls.length > 0 ||
    Boolean(media.photoUrl) ||
    (media.mediaType === "photo" && Boolean(media.mediaUrl));
  const hasExplicitInstagram =
    media.instagramUrls.length > 0 ||
    (media.mediaType === "instagram" && Boolean(media.mediaUrl));

  let photoUrls: string[] = [];
  if (hasExplicitPhoto) {
    if (media.photoUrls.length > 0) {
      photoUrls = media.photoUrls;
    } else if (media.photoUrl) {
      photoUrls = [media.photoUrl];
    } else if (media.mediaUrl) {
      photoUrls = [media.mediaUrl];
    }
  } else if (fillFromProfile && input.avatarUrl) {
    photoUrls = [input.avatarUrl];
  }

  const photoUrl = photoUrls[0] ?? null;

  const instagramUrls = hasExplicitInstagram
    ? media.instagramUrls.length > 0
      ? media.instagramUrls
      : media.mediaUrl
        ? [media.mediaUrl]
        : []
    : fillFromProfile && instagramProfileUrl
      ? [instagramProfileUrl]
      : [];

  const mediaUrl = photoUrl ?? instagramUrls[0] ?? null;
  const mediaType: MediaType | null = photoUrl
    ? "photo"
    : instagramUrls.length > 0
      ? "instagram"
      : null;

  return {
    id: input.id,
    placeLabel: input.placeLabel,
    placePath: input.placePath ?? null,
    note: input.note,
    photoUrl,
    photoUrls,
    instagramUrls,
    mediaType,
    mediaUrl,
    mediaDisplayUrl: hubPhotoDisplayUrl(photoUrl),
    mediaPreviewUrl: input.mediaPreviewUrl ?? photoUrl,
    visitDates: input.visitDates ?? [],
    pinnedAt: input.pinnedAt,
    username: input.username,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    instagramProfileUrl,
    profilePath: input.profilePath,
  };
}

export function pinHasGalleryMedia(pin: HubTravelerPin): boolean {
  return (
    pinPhotoUrls(pin).length > 0 ||
    pinInstagramUrls(pin).length > 0 ||
    Boolean(pin.mediaUrl)
  );
}

export function pinHasPhotoMedia(pin: HubTravelerPin): boolean {
  return pinPhotoUrls(pin).length > 0 || (pin.mediaType === "photo" && Boolean(pin.mediaUrl));
}

export function pinHasInstagramMedia(pin: HubTravelerPin): boolean {
  return pinInstagramUrls(pin).length > 0 || pin.mediaType === "instagram";
}

export function expandHubPinGalleryItems(pins: HubTravelerPin[]): HubGalleryItem[] {
  const items: HubGalleryItem[] = [];

  for (const pin of pins) {
    const photoUrls = pinPhotoUrls(pin);
    const instagramUrls = pinInstagramUrls(pin);

    photoUrls.forEach((url, index) => {
      items.push({
        id: `${pin.id}:photo:${index}`,
        pin,
        mediaType: "photo",
        mediaUrl: url,
        mediaDisplayUrl: hubPhotoDisplayUrl(url),
      });
    });

    instagramUrls.forEach((url, index) => {
      items.push({
        id: `${pin.id}:ig:${index}`,
        pin,
        mediaType: "instagram",
        mediaUrl: url,
        mediaDisplayUrl: null,
      });
    });

    if (photoUrls.length === 0 && instagramUrls.length === 0 && pin.mediaUrl) {
      items.push({
        id: `${pin.id}:legacy`,
        pin,
        mediaType: pin.mediaType === "instagram" ? "instagram" : "photo",
        mediaUrl: pin.mediaUrl,
        mediaDisplayUrl:
          pin.mediaType === "instagram" ? null : hubPhotoDisplayUrl(pin.mediaUrl),
      });
    }
  }

  return items;
}

export type HubMediaItemStats = {
  photos: number;
  instagramPosts: number;
};

/** Total photo and Instagram items across hub pins (not unique travelers). */
export function countHubMediaItems(pins: HubTravelerPin[]): HubMediaItemStats {
  const items = expandHubPinGalleryItems(pins);
  return {
    photos: items.filter((item) => item.mediaType === "photo").length,
    instagramPosts: items.filter((item) => item.mediaType === "instagram").length,
  };
}

export type HubMediaTravelerStats = {
  photoTravelers: number;
  instagramTravelers: number;
};

/** Unique travelers who attached photo or Instagram media to a hub pin. */
export function countHubMediaTravelers(pins: HubTravelerPin[]): HubMediaTravelerStats {
  const photoUsers = new Set<string>();
  const instagramUsers = new Set<string>();

  for (const pin of pins) {
    if (pinHasPhotoMedia(pin)) {
      photoUsers.add(pin.username);
    }
    if (pinHasInstagramMedia(pin)) {
      instagramUsers.add(pin.username);
    }
  }

  return {
    photoTravelers: photoUsers.size,
    instagramTravelers: instagramUsers.size,
  };
}

export function pinPriority(pin: HubTravelerPin): number {
  if (pinHasGalleryMedia(pin)) return 2;
  if (pin.note) return 1;
  return 0;
}

export function pinsWithContent(pins: HubTravelerPin[]): HubTravelerPin[] {
  return pins.filter((pin) => pinHasGalleryMedia(pin) || Boolean(pin.note?.trim()));
}

export function sortHubTravelerPins(pins: HubTravelerPin[]): HubTravelerPin[] {
  return [...pins].map(normalizeHubTravelerPin).sort((a, b) => {
    const priorityDiff = pinPriority(b) - pinPriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    return b.pinnedAt.localeCompare(a.pinnedAt);
  });
}

/** Prefer a fresh owner pin over stale cached hub pins (e.g. right after photo upload). */
export function mergeOwnerHubPin(
  pins: HubTravelerPin[],
  ownerPin: HubTravelerPin | null
): HubTravelerPin[] {
  if (!ownerPin) return pins;
  if (!pinHasGalleryMedia(ownerPin) && !ownerPin.note?.trim()) return pins;

  const rest = pins.filter((pin) => pin.id !== ownerPin.id);
  return sortHubTravelerPins([ownerPin, ...rest]);
}

export function uniqueHubTravelers(pins: HubTravelerPin[], limit = 5): CountryTraveler[] {
  const seen = new Set<string>();
  const travelers: CountryTraveler[] = [];

  for (const pin of pins) {
    if (seen.has(pin.username)) continue;
    seen.add(pin.username);
    travelers.push({
      username: pin.username,
      displayName: pin.displayName,
      avatarUrl: pin.avatarUrl,
      profilePath: pin.profilePath,
      lastPinnedAt: pin.pinnedAt,
    });
    if (travelers.length >= limit) break;
  }

  return travelers;
}
