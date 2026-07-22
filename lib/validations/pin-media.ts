import { z } from "zod";
import { LIMITS } from "@/lib/constants";
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
    (urls) => urls.length <= LIMITS.maxPinPhotos,
    { message: `At most ${LIMITS.maxPinPhotos} photos allowed` }
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

export function refinePinMediaInput(data: {
  photo_url?: string | null;
  photo_urls?: string[];
  instagram_urls?: string[];
  media_type?: "photo" | "instagram" | null;
  media_url?: string | null;
}): boolean {
  const photoUrls = (data.photo_urls ?? [])
    .map((url) => url.trim())
    .filter(Boolean);

  if (photoUrls.length > LIMITS.maxPinPhotos) return false;
  if (photoUrls.some((url) => !isValidPhotoUrl(url))) return false;

  const legacyPhotoUrl = data.photo_url?.trim();
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
