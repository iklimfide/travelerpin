import { z } from "zod";
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

const instagramUrlsField = z
  .array(z.string())
  .optional()
  .nullable()
  .transform((value) => value ?? []);

export const pinMediaFields = {
  photo_url: photoUrlField,
  instagram_urls: instagramUrlsField,
  media_type: z.enum(["photo", "instagram"]).optional().nullable(),
  media_url: z.string().optional().nullable(),
};

export function refinePinMediaInput(data: {
  photo_url?: string | null;
  instagram_urls?: string[];
  media_type?: "photo" | "instagram" | null;
  media_url?: string | null;
}): boolean {
  const photoUrl = data.photo_url?.trim();
  const instagramUrls = (data.instagram_urls ?? []).map((url) => url.trim()).filter(Boolean);

  if (photoUrl) {
    try {
      new URL(photoUrl);
    } catch {
      return false;
    }
  }

  if (instagramUrls.some((url) => !isValidInstagramUrl(url))) {
    return false;
  }

  if (!photoUrl && instagramUrls.length === 0) {
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
