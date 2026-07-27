import { LIMITS } from "@/lib/constants";
import { detectImageMimeFromBuffer } from "@/lib/utils/image-mime";

/** Virtual picker files (Google Photos / content URI) — fail fast, no UI freeze. */
export const PIN_PHOTO_VIRTUAL_READ_TIMEOUT_MS = 500;

/** @deprecated Use PIN_PHOTO_VIRTUAL_READ_TIMEOUT_MS */
export const PIN_PHOTO_FORCE_READ_TIMEOUT_MS = PIN_PHOTO_VIRTUAL_READ_TIMEOUT_MS;

/** Local gallery / camera files may need longer to read on slow devices. */
export const PIN_PHOTO_LOCAL_READ_TIMEOUT_MS = 12_000;

export type PinPhotoReadFailureCode =
  | "PIN_PHOTO_READ_TIMEOUT"
  | "PIN_PHOTO_READ_FAILED"
  | "PIN_PHOTO_READ_EMPTY"
  | "PIN_PHOTO_UNSUPPORTED";

const VIRTUAL_PICKER_MIME = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
  "content/unknown",
]);

function readBlobWithTimeout(blob: Blob, timeoutMs: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("PIN_PHOTO_READ_TIMEOUT" satisfies PinPhotoReadFailureCode));
    }, timeoutMs);

    blob
      .arrayBuffer()
      .then((buffer) => {
        window.clearTimeout(timer);
        if (buffer.byteLength <= 0) {
          reject(new Error("PIN_PHOTO_READ_EMPTY" satisfies PinPhotoReadFailureCode));
          return;
        }
        resolve(buffer);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new Error("PIN_PHOTO_READ_FAILED"));
      });
  });
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/heif":
    case "image/heic":
      return "heic";
    default:
      return "jpg";
  }
}

function safePhotoFileName(originalName: string, mime: string): string {
  const ext = extensionForMime(mime);
  const base = originalName
    .replace(/\.[^.]+$/u, "")
    .replace(/[^\w.-]+/gu, "_")
    .slice(0, 48);
  return `${base || "photo"}.${ext}`;
}

function resolveImageMime(buffer: ArrayBuffer, declaredType: string): string | null {
  const sniffed = detectImageMimeFromBuffer(new Uint8Array(buffer.slice(0, 16)));
  if (sniffed) return sniffed;
  const t = declaredType.trim().toLowerCase();
  if (t.startsWith("image/") && !VIRTUAL_PICKER_MIME.has(t)) return t;
  return null;
}

export function pinPhotoNeedsForceRead(file: File): boolean {
  const type = file.type.trim().toLowerCase();
  if (VIRTUAL_PICKER_MIME.has(type)) return true;
  if (file.size <= 0) return true;
  return false;
}

function bytesToPinPhotoFile(
  file: File,
  buffer: ArrayBuffer,
  mime: string
): File | null {
  if (buffer.byteLength <= 0 || buffer.byteLength > LIMITS.avatarMaxBytes) {
    return null;
  }
  const name = safePhotoFileName(file.name, mime);
  return new File([buffer], name, {
    type: mime,
    lastModified: Date.now(),
  });
}

/** Read first bytes with the same hard timeout as full materialization. */
export async function readPinPhotoHeaderBytes(
  file: File,
  timeoutMs = PIN_PHOTO_LOCAL_READ_TIMEOUT_MS
): Promise<ArrayBuffer | null> {
  if (file.size <= 0) return null;
  try {
    const slice = file.slice(0, Math.min(16, file.size));
    return await readBlobWithTimeout(slice, timeoutMs);
  } catch {
    return null;
  }
}

/** Read virtual picker files (Google Photos / content URI) into a normal in-memory File. */
export async function materializePinPhotoFile(
  file: File,
  timeoutMs = PIN_PHOTO_VIRTUAL_READ_TIMEOUT_MS
): Promise<File | null> {
  if (file.size <= 0) return null;

  try {
    const buffer = await readBlobWithTimeout(file, timeoutMs);
    const mime = resolveImageMime(buffer, file.type);
    if (!mime) return null;
    return bytesToPinPhotoFile(file, buffer, mime);
  } catch {
    return null;
  }
}

/**
 * Ensures the picker file is readable locally before upload/preview.
 * Fails fast — no fetch/object-URL fallback, no second read pass.
 */
export async function ensureReadablePinPhotoFile(
  file: File,
  localReadTimeoutMs = PIN_PHOTO_LOCAL_READ_TIMEOUT_MS
): Promise<File | null> {
  if (file.size <= 0) return null;

  if (pinPhotoNeedsForceRead(file)) {
    return materializePinPhotoFile(file, PIN_PHOTO_VIRTUAL_READ_TIMEOUT_MS);
  }

  try {
    const head = await readBlobWithTimeout(
      file.slice(0, Math.min(16, file.size)),
      localReadTimeoutMs
    );
    const sniffed = detectImageMimeFromBuffer(new Uint8Array(head));
    const type = file.type.trim().toLowerCase();
    if (sniffed && type.startsWith("image/") && !VIRTUAL_PICKER_MIME.has(type)) {
      return file;
    }
  } catch {
    return null;
  }

  return null;
}
