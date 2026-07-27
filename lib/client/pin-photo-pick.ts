import { detectImageMimeFromBuffer } from "@/lib/utils/image-mime";
import {
  ensureReadablePinPhotoFile,
  PIN_PHOTO_LOCAL_READ_TIMEOUT_MS,
  readPinPhotoHeaderBytes,
} from "@/lib/client/pin-photo-force-read";

/**
 * Gallery / file picker — explicit MIME + extensions (no `image/*`) so Android
 * is less likely to open Google Photos instead of the device gallery.
 */
export const PIN_PHOTO_GALLERY_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

/** Camera capture — same explicit types, no wildcard. */
export const PIN_PHOTO_CAMERA_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

/** @deprecated Prefer PIN_PHOTO_GALLERY_ACCEPT / PIN_PHOTO_CAMERA_ACCEPT */
export const PIN_PHOTO_INPUT_ACCEPT = PIN_PHOTO_GALLERY_ACCEPT;

type PinPhotoPickerWindow = Window & {
  showOpenFilePicker?: (options: {
    multiple?: boolean;
    types?: { description: string; accept: Record<string, string[]> }[];
    excludeAcceptAllOption?: boolean;
  }) => Promise<FileSystemFileHandle[]>;
};

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i;

const NON_IMAGE_MIME_PREFIXES = ["video/", "audio/", "text/", "application/pdf"];

function hasImageExtension(name: string): boolean {
  return IMAGE_EXT.test(name.trim());
}

function declaredTypeLooksLikeImage(type: string): boolean {
  const t = type.trim().toLowerCase();
  if (!t) return false;
  if (t.startsWith("image/")) return true;
  if (t === "application/octet-stream") return false;
  return false;
}

function declaredTypeIsBlocked(type: string): boolean {
  const t = type.trim().toLowerCase();
  if (!t) return false;
  return NON_IMAGE_MIME_PREFIXES.some((prefix) => t.startsWith(prefix));
}

export type PinPhotoPickResult = {
  accepted: File[];
  rejectedUnsupported: boolean;
  mimeByFile: Map<File, string | null>;
};

/**
 * Opens the system file picker when supported (often a gallery/files UI on mobile).
 * Returns `null` when unsupported — use a hidden `<input type="file">` fallback.
 * Returns `[]` when the user cancels.
 */
export async function openPinPhotoGalleryFiles(maxCount: number): Promise<File[] | null> {
  const showOpenFilePicker = (window as PinPhotoPickerWindow).showOpenFilePicker;
  if (typeof showOpenFilePicker !== "function") {
    return null;
  }

  try {
    const handles = await showOpenFilePicker({
      multiple: maxCount > 1,
      types: [
        {
          description: "Images",
          accept: {
            "image/jpeg": [".jpg", ".jpeg"],
            "image/png": [".png"],
            "image/webp": [".webp"],
            "image/gif": [".gif"],
            "image/heic": [".heic"],
            "image/heif": [".heif"],
          },
        },
      ],
      excludeAcceptAllOption: false,
    });
    const files: File[] = [];
    for (const handle of handles.slice(0, maxCount)) {
      files.push(await handle.getFile());
    }
    return files;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return [];
    }
    return null;
  }
}

export async function pickPinPhotoFiles(
  files: File[],
  readTimeoutMs = PIN_PHOTO_LOCAL_READ_TIMEOUT_MS
): Promise<PinPhotoPickResult> {
  const accepted: File[] = [];
  const mimeByFile = new Map<File, string | null>();
  let rejectedUnsupported = false;

  for (const raw of files) {
    if (raw.size <= 0) {
      rejectedUnsupported = true;
      continue;
    }

    const materialized = await ensureReadablePinPhotoFile(raw, readTimeoutMs);
    if (!materialized || materialized.size <= 0) {
      rejectedUnsupported = true;
      continue;
    }
    const file = materialized;

    const headBuffer = await readPinPhotoHeaderBytes(file, readTimeoutMs);
    if (!headBuffer) {
      rejectedUnsupported = true;
      continue;
    }

    const sniffed = detectImageMimeFromBuffer(new Uint8Array(headBuffer));

    if (sniffed) {
      accepted.push(file);
      mimeByFile.set(file, sniffed);
      continue;
    }

    if (declaredTypeIsBlocked(file.type)) {
      rejectedUnsupported = true;
      continue;
    }

    if (declaredTypeLooksLikeImage(file.type) || hasImageExtension(file.name)) {
      accepted.push(file);
      mimeByFile.set(file, file.type.startsWith("image/") ? file.type : null);
      continue;
    }

    rejectedUnsupported = true;
  }

  return { accepted, rejectedUnsupported, mimeByFile };
}

export function canBrowserPreviewPinPhoto(file: File, sniffedMime: string | null): boolean {
  const mime = (sniffedMime ?? (file.type.startsWith("image/") ? file.type : "")).toLowerCase();
  if (/heic|heif|avif|bmp|tiff?/.test(mime)) return false;
  if (IMAGE_EXT.test(file.name) && /\.(heic|heif|avif|bmp|tiff?)$/i.test(file.name)) return false;
  return true;
}
