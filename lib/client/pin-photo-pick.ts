import { LIMITS } from "@/lib/constants";
import { mimeFromImageFileName } from "@/lib/utils/image-mime";
import {
  ensureReadablePinPhotoFileDetailed,
  pinPhotoNeedsForceRead,
  PIN_PHOTO_LOCAL_READ_TIMEOUT_MS,
} from "@/lib/client/pin-photo-force-read";

/**
 * Gallery / file picker — explicit MIME + extensions (no `image/*`) so Android
 * is less likely to open Google Photos instead of the device gallery.
 */
export const PIN_PHOTO_GALLERY_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

/** @deprecated Prefer PIN_PHOTO_GALLERY_ACCEPT */
export const PIN_PHOTO_CAMERA_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

/** @deprecated Prefer PIN_PHOTO_GALLERY_ACCEPT */
export const PIN_PHOTO_INPUT_ACCEPT = PIN_PHOTO_GALLERY_ACCEPT;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i;

function hasImageExtension(name: string): boolean {
  return IMAGE_EXT.test(name.trim());
}

function declaredTypeLooksLikeImage(type: string): boolean {
  const t = type.trim().toLowerCase();
  return t.startsWith("image/");
}

export type PinPhotoPickResult = {
  accepted: File[];
  rejectedUnsupported: boolean;
  rejectedFileTooLarge: boolean;
  mimeByFile: Map<File, string | null>;
};

export async function pickPinPhotoFiles(
  files: File[],
  readTimeoutMs = PIN_PHOTO_LOCAL_READ_TIMEOUT_MS
): Promise<PinPhotoPickResult> {
  const accepted: File[] = [];
  const mimeByFile = new Map<File, string | null>();
  let rejectedUnsupported = false;
  let rejectedFileTooLarge = false;

  for (const raw of files) {
    if (raw.size > LIMITS.maxPinPhotoBytes) {
      rejectedFileTooLarge = true;
      continue;
    }

    const virtualOrEmpty = raw.size <= 0 || pinPhotoNeedsForceRead(raw);
    if (!virtualOrEmpty) {
      if (!declaredTypeLooksLikeImage(raw.type) && !hasImageExtension(raw.name)) {
        rejectedUnsupported = true;
        continue;
      }
    }

    const readResult = await ensureReadablePinPhotoFileDetailed(raw, readTimeoutMs);
    if (!readResult.ok) {
      if (readResult.reason === "too_large") rejectedFileTooLarge = true;
      else rejectedUnsupported = true;
      continue;
    }
    const materialized = readResult.file;

    if (materialized.size > LIMITS.maxPinPhotoBytes) {
      rejectedFileTooLarge = true;
      continue;
    }

    const mime =
      materialized.type.startsWith("image/") ?
        materialized.type
      : mimeFromImageFileName(materialized.name);

    accepted.push(materialized);
    mimeByFile.set(materialized, mime);
  }

  return { accepted, rejectedUnsupported, rejectedFileTooLarge, mimeByFile };
}

const PREVIEW_DECODE_TIMEOUT_MS = 4_000;

/** Ensures the browser can decode a previewable image (avoids broken img flicker on mobile). */
export async function validatePinPhotoBrowserPreview(
  file: File,
  sniffedMime: string | null
): Promise<boolean> {
  if (!canBrowserPreviewPinPhoto(file, sniffedMime)) return true;

  if (typeof createImageBitmap !== "function") return true;

  try {
    const bitmap = await Promise.race([
      createImageBitmap(file),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("preview_timeout")), PREVIEW_DECODE_TIMEOUT_MS);
      }),
    ]);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

export function canBrowserPreviewPinPhoto(file: File, sniffedMime: string | null): boolean {
  const mime = (sniffedMime ?? (file.type.startsWith("image/") ? file.type : "")).toLowerCase();
  if (/heic|heif|avif|bmp|tiff?/.test(mime)) return false;
  if (IMAGE_EXT.test(file.name) && /\.(heic|heif|avif|bmp|tiff?)$/i.test(file.name)) return false;
  return true;
}
