import {
  hubPhotoProxyPath,
  parseHubPhotoProxyRequest,
  parseR2ObjectKey,
  readMediaCacheBuster,
} from "@/lib/storage/r2-public";
import { readPhotoUrl, type PinMediaRow } from "@/lib/utils/pin-media";
import type { MediaType } from "@/types/database";

/** Browser-safe media src: same-origin /api/hub-photo for R2 objects. */
export function toHubPhotoSrc(mediaUrl: string | null | undefined): string | null {
  if (!mediaUrl) return null;

  const trimmed = mediaUrl.trim();
  if (!trimmed) return null;

  const legacyProxy = parseHubPhotoProxyRequest(trimmed);
  if (legacyProxy) {
    return hubPhotoProxyPath(legacyProxy.key, legacyProxy.cacheBuster);
  }

  const key = parseR2ObjectKey(trimmed);
  if (key) {
    return hubPhotoProxyPath(key, readMediaCacheBuster(trimmed));
  }

  return trimmed;
}

/** Resolve pin/city/park media for display — proxy R2 objects, pass through other URLs. */
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

/** Prefer server-resolved display URL, then resolve raw R2 links on the client. */
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
