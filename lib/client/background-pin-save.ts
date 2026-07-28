import { buildPinMediaPayload } from "@/components/dashboard/PinMediaFields";
import { notifyProfileDataChanged } from "@/lib/client/session-page-cache";
import { pinPhotoMediaChanged } from "@/lib/utils/pin-media";
import { isValidInstagramUrl } from "@/lib/utils/instagram";
import { formatPhotoUploadError } from "@/lib/utils/photo-upload-error";

export type BackgroundPinMediaSnapshot = {
  savedPhotoUrls: string[];
  removedSavedPhotoUrls: string[];
  newPhotoFiles: File[];
  instagramUrls: string[];
  previousPhotoUrls: string[];
};

export type BackgroundPinSaveOptions = {
  media: BackgroundPinMediaSnapshot;
  saveRecord: (media: {
    photo_url: string | null;
    photo_urls: string[];
    instagram_urls: string[];
  }) => Promise<Response>;
  onError: (message: string) => void | Promise<void>;
  onPhotoChanged?: () => void;
  /** Called when upload/media payload is ready — close modals here; PATCH may still run. */
  onMediaReady?: () => void;
  /** Called when save returns 404 (record already removed). */
  onNotFound?: () => void;
  genericSaveFailedMessage: string;
  formatPhotoUploadError?: (message: string) => string;
};

export async function executeBackgroundPinSave(options: BackgroundPinSaveOptions): Promise<boolean> {
  const formatUploadError = options.formatPhotoUploadError ?? formatPhotoUploadError;
  const mediaResult = await buildPinMediaPayload({
    savedPhotoUrls: options.media.savedPhotoUrls,
    removedSavedPhotoUrls: options.media.removedSavedPhotoUrls,
    newPhotoFiles: options.media.newPhotoFiles,
    instagramUrls: options.media.instagramUrls,
    isValidInstagramUrl,
    formatPhotoUploadError: formatUploadError,
  });

  if (!mediaResult.ok) {
    await options.onError(mediaResult.error);
    return false;
  }

  options.onMediaReady?.();

  let res: Response;
  try {
    res = await options.saveRecord({
      photo_url: mediaResult.photo_url,
      photo_urls: mediaResult.photo_urls,
      instagram_urls: mediaResult.instagram_urls,
    });
  } catch {
    await options.onError(options.genericSaveFailedMessage);
    return false;
  }

  if (res.status === 404 && options.onNotFound) {
    options.onNotFound();
    return false;
  }

  if (!res.ok) {
    let message = options.genericSaveFailedMessage;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error?.trim()) message = data.error.trim();
    } catch {
      /* use generic */
    }
    await options.onError(message);
    return false;
  }

  notifyProfileDataChanged();
  if (
    pinPhotoMediaChanged({
      savedPhotoUrls: options.media.savedPhotoUrls,
      removedSavedPhotoUrls: options.media.removedSavedPhotoUrls,
      newPhotoFiles: options.media.newPhotoFiles,
      previousPhotoUrls: options.media.previousPhotoUrls,
      nextPhotoUrls: mediaResult.photo_urls,
    })
  ) {
    options.onPhotoChanged?.();
  }
  return true;
}

export function startBackgroundPinSave(options: BackgroundPinSaveOptions): void {
  void executeBackgroundPinSave(options);
}
