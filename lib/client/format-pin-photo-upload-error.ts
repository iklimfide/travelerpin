import { LIMITS } from "@/lib/constants";
import {
  PIN_PHOTO_FILE_TOO_LARGE_ERROR,
  UNSUPPORTED_IMAGE_FORMAT_ERROR,
} from "@/lib/utils/image-errors";
import { formatPhotoUploadError as formatPhotoUploadErrorDefault } from "@/lib/utils/photo-upload-error";

type PinPhotoUploadErrorTranslator = (
  key: "photoUploadFileTooLarge" | "photoUploadUnsupportedFormat",
  values?: Record<string, string | number>
) => string;

export function pinPhotoMaxSizeMb(): number {
  return LIMITS.maxPinPhotoBytes / (1024 * 1024);
}

/** Maps machine upload error codes to locale-aware copy (e.g. profile modals). */
export function formatPinPhotoUploadError(
  tCommon: PinPhotoUploadErrorTranslator,
  message: string
): string {
  if (message === PIN_PHOTO_FILE_TOO_LARGE_ERROR) {
    return tCommon("photoUploadFileTooLarge", { maxMb: pinPhotoMaxSizeMb() });
  }
  if (message === UNSUPPORTED_IMAGE_FORMAT_ERROR) {
    return tCommon("photoUploadUnsupportedFormat");
  }
  return formatPhotoUploadErrorDefault(message);
}

export { PIN_PHOTO_FILE_TOO_LARGE_ERROR, UNSUPPORTED_IMAGE_FORMAT_ERROR };
