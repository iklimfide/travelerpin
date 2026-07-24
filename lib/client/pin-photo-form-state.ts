import { readInstagramUrls, readPhotoUrls } from "@/lib/utils/pin-media";
import type { PinMediaRow } from "@/lib/utils/pin-media";

export function createPinPhotoFormState(row?: PinMediaRow | null) {
  return {
    savedPhotoUrls: readPhotoUrls(row),
    removedSavedPhotoUrls: [] as string[],
    newPhotoFiles: [] as File[],
  };
}

export function readPinPhotoUrlsFromRow(row?: PinMediaRow | null): string[] {
  return readPhotoUrls(row);
}

export { readInstagramUrls };
