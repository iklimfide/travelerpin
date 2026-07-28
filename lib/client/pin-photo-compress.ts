import { LIMITS } from "@/lib/constants";

/** Stay under Vercel/serverless ~4.5 MB request body limit (multipart overhead). */
export const PIN_PHOTO_UPLOAD_BODY_SAFE_MAX_BYTES = 4 * 1024 * 1024;

export type CompressPinPhotoResult =
  | { ok: true; file: File }
  | { ok: false; reason: "too_large" | "unsupported" };

function jpegFileFromBlob(blob: Blob, originalName: string): File {
  const base = originalName.replace(/\.[^.]+$/u, "") || "photo";
  return new File([blob], `${base}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function encodeJpegUnderLimit(
  bitmap: ImageBitmap,
  maxBytes: number
): Promise<Blob | null> {
  let scale = 1;
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest > LIMITS.imageMaxWidth) {
    scale = LIMITS.imageMaxWidth / longest;
  }

  while (scale >= 0.3) {
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.88;
    while (quality >= 0.48) {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality);
      });
      if (blob && blob.size > 0 && blob.size <= maxBytes) return blob;
      quality -= 0.08;
    }
    scale *= 0.82;
  }

  return null;
}

export async function compressPinPhotoForUpload(file: File): Promise<CompressPinPhotoResult> {
  if (file.size <= PIN_PHOTO_UPLOAD_BODY_SAFE_MAX_BYTES) {
    return { ok: true, file };
  }

  if (typeof createImageBitmap !== "function") {
    return { ok: false, reason: "too_large" };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const blob = await encodeJpegUnderLimit(bitmap, PIN_PHOTO_UPLOAD_BODY_SAFE_MAX_BYTES);
    bitmap.close();

    if (!blob) {
      return { ok: false, reason: "too_large" };
    }

    return { ok: true, file: jpegFileFromBlob(blob, file.name) };
  } catch {
    return { ok: false, reason: "unsupported" };
  }
}
