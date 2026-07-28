import { commonMessages, formatMessage } from "@/lib/i18n/message-catalog";
import { LIMITS } from "@/lib/constants";
import {
  PIN_PHOTO_FILE_TOO_LARGE_ERROR,
  UNSUPPORTED_IMAGE_FORMAT_ERROR,
} from "@/lib/utils/image-errors";

export function formatPhotoUploadError(message: string | undefined | null): string {
  const raw = (message ?? "").trim();
  const lower = raw.toLowerCase();

  if (!raw) {
    return commonMessages.photoUploadFailed;
  }

  if (lower.includes("empty image file")) {
    return commonMessages.photoUploadFailed;
  }

  if (raw === PIN_PHOTO_FILE_TOO_LARGE_ERROR) {
    const maxMb = LIMITS.maxPinPhotoBytes / (1024 * 1024);
    return formatMessage(commonMessages.photoUploadFileTooLarge, { maxMb });
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
