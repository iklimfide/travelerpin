import { LIMITS } from "@/lib/constants";
import { isYpInstagramImportUsername } from "@/lib/kamikaze/instagram-import-targets";

/** YP / showcase allowlist — hub & profil pin başına çoklu foto. */
export const ELEVATED_PIN_PHOTO_LIMIT = 20;

export function maxPinPhotosForUsername(username: string | null | undefined): number {
  const normalized = username?.trim().toLowerCase();
  if (normalized && isYpInstagramImportUsername(normalized)) {
    return ELEVATED_PIN_PHOTO_LIMIT;
  }
  return LIMITS.maxPinPhotos;
}
