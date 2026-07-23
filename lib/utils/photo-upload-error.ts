import { commonMessages } from "@/lib/i18n/message-catalog";
import { UNSUPPORTED_IMAGE_FORMAT_ERROR } from "@/lib/utils/image-errors";

export function formatPhotoUploadError(message: string | undefined | null): string {
  const raw = (message ?? "").trim();
  const lower = raw.toLowerCase();

  if (!raw) {
    return commonMessages.photoUploadFailed;
  }

  if (raw === UNSUPPORTED_IMAGE_FORMAT_ERROR || lower.includes("could not be converted to webp")) {
    return commonMessages.photoUploadUnsupportedFormat;
  }

  if (lower.includes("bucket not found") || lower.includes("r2 not configured")) {
    return commonMessages.photoUploadNotConfigured;
  }

  if (lower.includes("row-level security") || lower.includes("rls")) {
    return commonMessages.photoUploadRlsDenied;
  }

  return raw;
}
