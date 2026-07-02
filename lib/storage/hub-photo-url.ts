import { parseR2ObjectKey } from "@/lib/storage/r2";
import { readPhotoUrl, type PinMediaRow } from "@/lib/utils/pin-media";
import type { MediaType } from "@/types/database";

/** Serve R2 uploads through our API when the public bucket URL is unreachable. */
export function toHubPhotoSrc(mediaUrl: string | null | undefined): string | null {
  if (!mediaUrl) return null;

  const key = parseR2ObjectKey(mediaUrl);
  if (key) {
    return `/api/hub-photo?key=${encodeURIComponent(key)}`;
  }

  return mediaUrl;
}

/** Resolve pin/city/park media for next/image — avoids slow or flaky direct R2 fetches. */
export function resolvePublicMediaImageUrl(
  mediaUrl: string | null | undefined
): string | null {
  if (!mediaUrl) return null;
  return toHubPhotoSrc(mediaUrl) ?? mediaUrl;
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
