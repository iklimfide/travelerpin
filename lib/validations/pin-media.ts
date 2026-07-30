import { z } from "zod";
import { LIMITS } from "@/lib/constants";
import { ELEVATED_PIN_PHOTO_LIMIT } from "@/lib/utils/pin-photo-limits";
import { isValidInstagramUrl } from "@/lib/utils/instagram";

const photoUrlField = z
  .string()
  .optional()
  .nullable()
  .refine(
    (value) => {
      if (!value?.trim()) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Valid photo URL required" }
  );

const photoUrlsField = z
  .array(z.string())
  .optional()
  .nullable()
  .transform((value) => value ?? [])
  .refine(
    (urls) => urls.length <= ELEVATED_PIN_PHOTO_LIMIT,
    { message: `At most ${ELEVATED_PIN_PHOTO_LIMIT} photos allowed` }
  );

const instagramUrlsField = z
  .array(z.string())
  .optional()
  .nullable()
  .transform((value) => value ?? []);

export const pinMediaFields = {
  photo_url: photoUrlField,
  photo_urls: photoUrlsField,
  instagram_urls: instagramUrlsField,
  media_type: z.enum(["photo", "instagram"]).optional().nullable(),
  media_url: z.string().optional().nullable(),
};

function isValidPhotoUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function refinePinMediaInput(
  data: {
    photo_url?: string | null;
    photo_urls?: string[];
    instagram_urls?: string[];
    media_type?: "photo" | "instagram" | null;
    media_url?: string | null;
  },
  maxPhotos = ELEVATED_PIN_PHOTO_LIMIT
): boolean {
  const photoUrls = (data.photo_urls ?? [])
    .map((url) => url.trim())
    .filter(Boolean);

  const legacyPhotoUrl = data.photo_url?.trim();
  const photoCount =
    photoUrls.length > 0 ? photoUrls.length : legacyPhotoUrl ? 1 : 0;

  if (photoCount > maxPhotos) return false;
  if (photoUrls.some((url) => !isValidPhotoUrl(url))) return false;
  if (legacyPhotoUrl && !isValidPhotoUrl(legacyPhotoUrl)) return false;

  const instagramUrls = (data.instagram_urls ?? []).map((url) => url.trim()).filter(Boolean);

  if (instagramUrls.some((url) => !isValidInstagramUrl(url))) {
    return false;
  }

  const hasPhotos = photoUrls.length > 0 || Boolean(legacyPhotoUrl);

  if (!hasPhotos && instagramUrls.length === 0) {
    if (!data.media_type || !data.media_url) return true;
    if (data.media_type === "instagram") return isValidInstagramUrl(data.media_url);
    try {
      new URL(data.media_url);
      return true;
    } catch {
      return false;
    }
  }

  return true;
}

export const pinMediaRefineMessage = "Valid photo URL and Instagram links required";
