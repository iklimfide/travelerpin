import { LIMITS } from "@/lib/constants";
import { detectImageMimeFromBuffer } from "@/lib/utils/image-mime";

export const PIN_PHOTO_FORCE_READ_TIMEOUT_MS = 45_000;

const VIRTUAL_PICKER_MIME = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
  "content/unknown",
]);

function readBlobWithTimeout(blob: Blob, timeoutMs: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("PIN_PHOTO_READ_TIMEOUT"));
    }, timeoutMs);

    blob
      .arrayBuffer()
      .then((buffer) => {
        window.clearTimeout(timer);
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

async function readViaObjectUrlFetch(
  file: File,
  timeoutMs: number
): Promise<ArrayBuffer> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(objectUrl, { signal: controller.signal });
      if (!response.ok) {
        throw new Error("PIN_PHOTO_FETCH_FAILED");
      }
      return await response.arrayBuffer();
    } finally {
      window.clearTimeout(timer);
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function readPinPhotoBytes(file: File, timeoutMs: number): Promise<ArrayBuffer> {
  try {
    return await readBlobWithTimeout(file, timeoutMs);
  } catch {
    return readViaObjectUrlFetch(file, timeoutMs);
  }
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

/** Read virtual picker files (Google Photos / content URI) into a normal in-memory File. */
export async function materializePinPhotoFile(
  file: File,
  timeoutMs = PIN_PHOTO_FORCE_READ_TIMEOUT_MS
): Promise<File | null> {
  try {
    const buffer = await readPinPhotoBytes(file, timeoutMs);
    const mime = resolveImageMime(buffer, file.type);
    if (!mime) return null;
    return bytesToPinPhotoFile(file, buffer, mime);
  } catch {
    return null;
  }
}

/**
 * Ensures the picker file is readable locally before upload/preview.
 * Fast-path keeps the original File when type and header bytes look valid.
 */
export async function ensureReadablePinPhotoFile(
  file: File,
  timeoutMs = PIN_PHOTO_FORCE_READ_TIMEOUT_MS
): Promise<File | null> {
  if (pinPhotoNeedsForceRead(file)) {
    return materializePinPhotoFile(file, timeoutMs);
  }

  try {
    const head = await readBlobWithTimeout(file.slice(0, 16), Math.min(timeoutMs, 12_000));
    const sniffed = detectImageMimeFromBuffer(new Uint8Array(head));
    const type = file.type.trim().toLowerCase();
    if (sniffed && type.startsWith("image/") && !VIRTUAL_PICKER_MIME.has(type)) {
      return file;
    }
  } catch {
    return materializePinPhotoFile(file, timeoutMs);
  }

  return materializePinPhotoFile(file, timeoutMs);
}
