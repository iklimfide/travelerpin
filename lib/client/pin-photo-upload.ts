"use client";

import {
  compressPinPhotoForUpload,
  PIN_PHOTO_UPLOAD_BODY_SAFE_MAX_BYTES,
} from "@/lib/client/pin-photo-compress";
import { preparePinPhotoFileForUpload } from "@/lib/client/pin-photo-force-read";
import { LIMITS } from "@/lib/constants";
import { PIN_PHOTO_FILE_TOO_LARGE_ERROR, UNSUPPORTED_IMAGE_FORMAT_ERROR } from "@/lib/utils/image-errors";
import { detectImageMimeFromBuffer, mimeFromImageFileName } from "@/lib/utils/image-mime";

async function readFileBytes(file: File): Promise<ArrayBuffer | null> {
  try {
    const bytes = await file.arrayBuffer();
    return bytes.byteLength > 0 ? bytes : null;
  } catch {
    return null;
  }
}

function mimeFromBytes(bytes: ArrayBuffer, fileName: string, declaredType: string): string | null {
  const view = new Uint8Array(bytes, 0, Math.min(32, bytes.byteLength));
  const sniffed = detectImageMimeFromBuffer(view);
  if (sniffed) return sniffed;
  if (declaredType.trim().toLowerCase().startsWith("image/")) return declaredType.trim();
  return mimeFromImageFileName(fileName);
}

async function resolveUploadFile(
  file: File
): Promise<{ bytes: ArrayBuffer; name: string; mime: string } | null> {
  const directBytes = await readFileBytes(file);
  if (directBytes) {
    const name = file.name || "photo.jpg";
    const mime = mimeFromBytes(directBytes, name, file.type);
    if (!mime?.startsWith("image/")) return null;
    return { bytes: directBytes, name, mime };
  }

  const materialized = await preparePinPhotoFileForUpload(file);
  if (!materialized || materialized.size <= 0) return null;

  const bytes = await readFileBytes(materialized);
  if (!bytes) return null;

  const name = materialized.name || "photo.jpg";
  const mime = mimeFromBytes(bytes, name, materialized.type);
  if (!mime?.startsWith("image/")) return null;

  return { bytes, name, mime };
}

export async function uploadPinPhotoToR2(
  file: File,
  formatPhotoUploadError: (message: string) => string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (file.size > LIMITS.maxPinPhotoBytes) {
    return { ok: false, error: formatPhotoUploadError(PIN_PHOTO_FILE_TOO_LARGE_ERROR) };
  }

  const compressed = await compressPinPhotoForUpload(file);
  if (!compressed.ok) {
    if (compressed.reason === "too_large") {
      return { ok: false, error: formatPhotoUploadError(PIN_PHOTO_FILE_TOO_LARGE_ERROR) };
    }
    return { ok: false, error: formatPhotoUploadError(UNSUPPORTED_IMAGE_FORMAT_ERROR) };
  }

  const fileForUpload = compressed.file;
  if (fileForUpload.size > PIN_PHOTO_UPLOAD_BODY_SAFE_MAX_BYTES) {
    return { ok: false, error: formatPhotoUploadError(PIN_PHOTO_FILE_TOO_LARGE_ERROR) };
  }

  const resolved = await resolveUploadFile(fileForUpload);
  if (!resolved) {
    return { ok: false, error: formatPhotoUploadError(UNSUPPORTED_IMAGE_FORMAT_ERROR) };
  }

  const uploadFile = new File([resolved.bytes], resolved.name, { type: resolved.mime });

  const formData = new FormData();
  formData.append("file", uploadFile, uploadFile.name);

  let uploadRes: Response;
  try {
    uploadRes = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  } catch {
    return { ok: false, error: formatPhotoUploadError("Upload failed") };
  }

  if (uploadRes.status === 413) {
    return { ok: false, error: formatPhotoUploadError(PIN_PHOTO_FILE_TOO_LARGE_ERROR) };
  }

  if (!uploadRes.ok) {
    let apiError = "";
    try {
      const data = (await uploadRes.json()) as { error?: string };
      apiError = data.error ?? "";
    } catch {
      apiError = "";
    }
    if (!apiError && uploadFile.size > PIN_PHOTO_UPLOAD_BODY_SAFE_MAX_BYTES) {
      return { ok: false, error: formatPhotoUploadError(PIN_PHOTO_FILE_TOO_LARGE_ERROR) };
    }
    return { ok: false, error: formatPhotoUploadError(apiError || "Upload failed") };
  }

  let url = "";
  try {
    const data = (await uploadRes.json()) as { url?: string };
    url = data.url ?? "";
  } catch {
    return { ok: false, error: formatPhotoUploadError("Upload failed") };
  }

  if (!url) {
    return { ok: false, error: formatPhotoUploadError("Upload failed") };
  }

  return { ok: true, url };
}
