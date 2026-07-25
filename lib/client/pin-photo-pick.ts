import { detectImageMimeFromBuffer } from "@/lib/utils/image-mime";

/** Wide picker filter — OS may still return octet-stream; we sniff bytes on pick. */
export const PIN_PHOTO_INPUT_ACCEPT =
  "image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.avif,.bmp,.tif,.tiff";

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

export async function pickPinPhotoFiles(files: File[]): Promise<PinPhotoPickResult> {
  const accepted: File[] = [];
  const mimeByFile = new Map<File, string | null>();
  let rejectedUnsupported = false;

  for (const file of files) {
    if (file.size <= 0) {
      rejectedUnsupported = true;
      continue;
    }

    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const sniffed = detectImageMimeFromBuffer(head);

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
