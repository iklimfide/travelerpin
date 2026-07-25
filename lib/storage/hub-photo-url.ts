import {
  hubPhotoProxyPath,
  isR2PublicMediaUrl,
  parseR2ObjectKey,
  publicR2UrlForObjectKey,
  readMediaCacheBuster,
} from "@/lib/storage/r2";
import { readPhotoUrl, type PinMediaRow } from "@/lib/utils/pin-media";
import type { MediaType } from "@/types/database";

/** Serve R2 uploads through our API — bucket public access is not required. */
export function toHubPhotoSrc(mediaUrl: string | null | undefined): string | null {
  if (!mediaUrl) return null;

  const trimmed = mediaUrl.trim();

  // Public bucket URLs load from R2/CDN directly — avoids one serverless invoke per image.
  if (isR2PublicMediaUrl(trimmed)) {
    return trimmed;
  }

  const key = parseR2ObjectKey(trimmed);
  if (key) {
    const buster = readMediaCacheBuster(trimmed);
    const direct = publicR2UrlForObjectKey(key, buster);
    if (direct && isR2PublicMediaUrl(direct)) {
      return direct;
    }
    return hubPhotoProxyPath(key, buster);
  }

  return trimmed;
}

/** Resolve pin/city/park media for display — never expose private R2 URLs directly. */
export function resolvePublicMediaImageUrl(
  mediaUrl: string | null | undefined
): string | null {
  if (!mediaUrl) return null;
  return toHubPhotoSrc(mediaUrl);
}

export function profilePinImageUrl(item: {
  photo_url?: string | null;
  instagram_urls?: string[] | null;
  media_type?: MediaType | string | null;
  media_url?: string | null;
  media_preview_url?: string | null;
}): string | null {
  const photo = readPhotoUrl(item as PinMediaRow);
  if (photo) return resolvePublicMediaImageUrl(photo);
  if (item.media_preview_url) return resolvePublicMediaImageUrl(item.media_preview_url);
  return null;
}

/** Prefer server-resolved proxy URL, then resolve raw R2 links on the client. */
export function hubGalleryPhotoSrc(item: {
  mediaDisplayUrl: string | null;
  mediaUrl: string;
}): string | null {
  return item.mediaDisplayUrl ?? resolvePublicMediaImageUrl(item.mediaUrl);
}

export function hubPinPhotoSrc(pin: {
  mediaDisplayUrl: string | null;
  photoUrl?: string | null;
  mediaUrl: string | null;
}): string | null {
  if (pin.mediaDisplayUrl) return pin.mediaDisplayUrl;
  const raw = pin.photoUrl ?? pin.mediaUrl;
  return raw ? resolvePublicMediaImageUrl(raw) : null;
}
