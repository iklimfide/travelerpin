import { LIMITS } from "@/lib/constants";
import { detectImageMimeFromBuffer, mimeFromImageFileName } from "@/lib/utils/image-mime";

/** Virtual picker files (Google Photos / content URI) — fail fast, no UI freeze. */
export const PIN_PHOTO_VIRTUAL_READ_TIMEOUT_MS = 500;

/** @deprecated Use PIN_PHOTO_VIRTUAL_READ_TIMEOUT_MS */
export const PIN_PHOTO_FORCE_READ_TIMEOUT_MS = PIN_PHOTO_VIRTUAL_READ_TIMEOUT_MS;

/** Local gallery files may need longer to read on slow devices. */
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

/** @deprecated Use LIMITS.maxPinPhotoBytes */
export const PIN_PHOTO_MATERIALIZE_MAX_BYTES = LIMITS.maxPinPhotoBytes;

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

function resolveImageMime(buffer: ArrayBuffer, declaredType: string, fileName: string): string | null {
  const view = new Uint8Array(buffer, 0, Math.min(32, buffer.byteLength));
  const sniffed = detectImageMimeFromBuffer(view);
  if (sniffed) return sniffed;
  const t = declaredType.trim().toLowerCase();
  if (t.startsWith("image/") && !VIRTUAL_PICKER_MIME.has(t)) return t;
  return mimeFromImageFileName(fileName);
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
  if (buffer.byteLength <= 0 || buffer.byteLength > LIMITS.maxPinPhotoBytes) {
    return null;
  }
  const name = safePhotoFileName(file.name, mime);
  return new File([buffer], name, {
    type: mime,
    lastModified: Date.now(),
  });
}

/** Read first bytes with a hard timeout. */
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

/** Read picker file into a normal in-memory File (safe for FormData upload). */
export async function materializePinPhotoFile(
  file: File,
  timeoutMs = PIN_PHOTO_LOCAL_READ_TIMEOUT_MS
): Promise<File | null> {
  if (file.size <= 0 || file.size > LIMITS.maxPinPhotoBytes) return null;

  try {
    const buffer = await readBlobWithTimeout(file, timeoutMs);
    const mime = resolveImageMime(buffer, file.type, file.name);
    if (!mime) return null;
    return bytesToPinPhotoFile(file, buffer, mime);
  } catch {
    return null;
  }
}

/**
 * Ensures the picker file is readable and upload-safe (always in-memory when possible).
 */
export async function ensureReadablePinPhotoFile(
  file: File,
  localReadTimeoutMs = PIN_PHOTO_LOCAL_READ_TIMEOUT_MS
): Promise<File | null> {
  if (file.size <= 0 || file.size > LIMITS.maxPinPhotoBytes) return null;

  const materialized = await materializePinPhotoFile(file, localReadTimeoutMs);
  if (materialized) return materialized;

  if (pinPhotoNeedsForceRead(file)) {
    return materializePinPhotoFile(file, PIN_PHOTO_VIRTUAL_READ_TIMEOUT_MS);
  }

  return null;
}

/** Same as ensureReadable — pick and upload share one materialization path. */
export async function preparePinPhotoFileForUpload(
  file: File,
  localReadTimeoutMs = PIN_PHOTO_LOCAL_READ_TIMEOUT_MS
): Promise<File | null> {
  return ensureReadablePinPhotoFile(file, localReadTimeoutMs);
}
