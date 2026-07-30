"use client";

import { useEffect, useRef, useState } from "react";
import {
  canBrowserPreviewPinPhoto,
  pickPinPhotoFiles,
  PIN_PHOTO_GALLERY_ACCEPT,
} from "@/lib/client/pin-photo-pick";
import {
  pinPhotoPreviewObjectUrl,
  revokeAllPinPhotoPreviewObjectUrls,
  revokePinPhotoPreviewObjectUrl,
} from "@/lib/client/pin-photo-preview-cache";
import { uploadPinPhotoToR2 } from "@/lib/client/pin-photo-upload";
import {
  formatPinPhotoUploadError,
  PIN_PHOTO_FILE_TOO_LARGE_ERROR,
} from "@/lib/client/format-pin-photo-upload-error";
import { LIMITS } from "@/lib/constants";
import { useTranslateCommon } from "@/lib/i18n/client-messages";
import { activePinPhotoCount } from "@/lib/utils/pin-media";
import { normalizeInstagramPostUrl } from "@/lib/utils/instagram";

type PinMediaFieldsProps = {
  labels: {
    mediaHint: string;
    photo: string;
    photoLibrary?: string;
    photoSaved: string;
    instagram: string;
    instagramHint: string;
    addInstagram: string;
    removeInstagram: string;
    removePhoto: string;
  };
  savedPhotoUrls: string[];
  removedSavedPhotoUrls: string[];
  onRemovedSavedPhotoUrlsChange: (urls: string[]) => void;
  newPhotoFiles: File[];
  onNewPhotoFilesChange: (files: File[]) => void;
  instagramUrls: string[];
  onInstagramUrlsChange: (urls: string[]) => void;
  autoFocusInstagram?: boolean;
  hideInstagramHint?: boolean;
  defaultInstagramField?: boolean;
  equalActionButtons?: boolean;
  hideMediaHint?: boolean;
  /** Shown when the picker returns a non-image (e.g. Google Photos edge cases). */
  onPhotoPickError?: (message: string) => void;
  photoUnsupportedFormatMessage?: string;
  formatPhotoUploadError?: (message: string) => string;
  /** Default 1; allowlist (arif, guvencgiller, nazli) get 20 via caller. */
  maxPinPhotos?: number;
};

export function PinMediaFields({
  labels,
  savedPhotoUrls,
  removedSavedPhotoUrls,
  onRemovedSavedPhotoUrlsChange,
  newPhotoFiles,
  onNewPhotoFilesChange,
  instagramUrls,
  onInstagramUrlsChange,
  autoFocusInstagram = false,
  hideInstagramHint = false,
  defaultInstagramField = false,
  equalActionButtons = false,
  hideMediaHint = false,
  onPhotoPickError,
  photoUnsupportedFormatMessage,
  formatPhotoUploadError: formatPhotoUploadErrorProp,
  maxPinPhotos = LIMITS.maxPinPhotos,
}: PinMediaFieldsProps) {
  const tCommon = useTranslateCommon();
  const formatUploadError =
    formatPhotoUploadErrorProp ??
    ((message: string) => formatPinPhotoUploadError(tCommon, message));

  function photoPickFileTooLargeMessage(): string {
    return formatUploadError(PIN_PHOTO_FILE_TOO_LARGE_ERROR);
  }

  function photoPickUnsupportedFormatMessage(): string {
    return photoUnsupportedFormatMessage ?? tCommon("photoUploadUnsupportedFormat");
  }

  const removedSetRef = useRef(new Set(removedSavedPhotoUrls));
  removedSetRef.current = new Set(removedSavedPhotoUrls);
  const visibleSavedUrls = savedPhotoUrls.filter((url) => !removedSetRef.current.has(url));
  const photoCount = activePinPhotoCount({
    savedPhotoUrls,
    removedSavedPhotoUrls,
    newPhotoFiles,
  });
  const multiPhoto = maxPinPhotos > 1;
  const canAddPhotos = multiPhoto ? photoCount < maxPinPhotos : true;
  const remainingSlots = multiPhoto ? maxPinPhotos - photoCount : 1;

  const instagramDraftRef = useRef<HTMLInputElement>(null);
  const photoLibraryInputRef = useRef<HTMLInputElement>(null);
  const pickedFileMimeRef = useRef(new WeakMap<File, string | null>());
  const photoPickBusyRef = useRef(false);
  const [photoPickInProgress, setPhotoPickInProgress] = useState(false);
  const photoPickGenerationRef = useRef(0);
  const lastPhotoInputAtRef = useRef(0);
  const lastPickErrorAtRef = useRef(0);
  const lastPickErrorMessageRef = useRef("");
  const newPhotoFilesRef = useRef(newPhotoFiles);
  newPhotoFilesRef.current = newPhotoFiles;

  useEffect(() => {
    return () => {
      revokeAllPinPhotoPreviewObjectUrls(newPhotoFilesRef.current);
    };
  }, []);

  useEffect(() => {
    if (!autoFocusInstagram) return;

    const frame = window.requestAnimationFrame(() => {
      instagramDraftRef.current?.focus();
      instagramDraftRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [autoFocusInstagram]);

  function updateInstagramUrl(index: number, value: string) {
    const next = [...instagramUrls];
    next[index] = value;
    onInstagramUrlsChange(next);
  }

  function addInstagramField() {
    onInstagramUrlsChange([...instagramUrls, ""]);
  }

  function removeInstagramField(index: number) {
    const next = instagramUrls.filter((_, i) => i !== index);
    if (defaultInstagramField && next.length === 0) {
      onInstagramUrlsChange([""]);
      return;
    }
    onInstagramUrlsChange(next);
  }

  function removeSavedPhoto(url: string) {
    if (removedSetRef.current.has(url)) return;
    onRemovedSavedPhotoUrlsChange([...removedSavedPhotoUrls, url]);
  }

  function removeNewPhoto(index: number) {
    const file = newPhotoFiles[index];
    if (file) revokePinPhotoPreviewObjectUrl(file);
    onNewPhotoFilesChange(newPhotoFiles.filter((_, i) => i !== index));
  }

  function resetPhotoPickerInputs() {
    if (photoLibraryInputRef.current) photoLibraryInputRef.current.value = "";
  }

  function notifyPickErrorOnce(message: string) {
    const now = Date.now();
    if (
      message === lastPickErrorMessageRef.current &&
      now - lastPickErrorAtRef.current < 1500
    ) {
      return;
    }
    lastPickErrorMessageRef.current = message;
    lastPickErrorAtRef.current = now;
    queueMicrotask(() => {
      onPhotoPickError?.(message);
    });
  }

  function openPhotoLibrary() {
    if (!canAddPhotos || photoPickBusyRef.current) return;
    photoLibraryInputRef.current?.click();
  }

  function processPhotoFiles(incoming: File[]) {
    const files = incoming.slice(0, remainingSlots);
    if (files.length === 0) return;

    const replaceSavedUrls = multiPhoto ? [] : visibleSavedUrls;

    const fileTooLargeMessage = photoPickFileTooLargeMessage();
    const unsupportedFormatMessage = photoPickUnsupportedFormatMessage();

    if (files.some((file) => file.size > LIMITS.maxPinPhotoBytes)) {
      notifyPickErrorOnce(fileTooLargeMessage);
      resetPhotoPickerInputs();
      return;
    }

    const generation = ++photoPickGenerationRef.current;
    photoPickBusyRef.current = true;
    setPhotoPickInProgress(true);

    void pickPinPhotoFiles(files)
      .then(({ accepted, rejectedFileTooLarge, mimeByFile }) => {
        if (generation !== photoPickGenerationRef.current) return;

        for (const [file, mime] of mimeByFile) {
          pickedFileMimeRef.current.set(file, mime);
        }

        let filesToAdd = rejectedFileTooLarge ? [] : [...accepted];

        if (generation !== photoPickGenerationRef.current) return;

        if (rejectedFileTooLarge) {
          notifyPickErrorOnce(fileTooLargeMessage);
        } else if (filesToAdd.length === 0) {
          notifyPickErrorOnce(unsupportedFormatMessage);
        }

        if (filesToAdd.length > 0) {
          for (const file of filesToAdd) {
            pinPhotoPreviewObjectUrl(file);
          }
          if (multiPhoto) {
            onNewPhotoFilesChange([...newPhotoFilesRef.current, ...filesToAdd]);
          } else {
            if (replaceSavedUrls.length > 0) {
              const removed = new Set(removedSavedPhotoUrls);
              const nextRemoved = [...removedSavedPhotoUrls];
              for (const url of replaceSavedUrls) {
                if (!removed.has(url)) nextRemoved.push(url);
              }
              onRemovedSavedPhotoUrlsChange(nextRemoved);
            }
            onNewPhotoFilesChange(filesToAdd.slice(0, 1));
          }
        }
      })
      .catch(() => {
        if (generation !== photoPickGenerationRef.current) return;
        notifyPickErrorOnce(unsupportedFormatMessage);
      })
      .finally(() => {
        if (generation !== photoPickGenerationRef.current) return;
        photoPickBusyRef.current = false;
        setPhotoPickInProgress(false);
        resetPhotoPickerInputs();
      });
  }

  function handlePhotoInputChange(fileList: FileList | null) {
    if (!fileList?.length || photoPickBusyRef.current) return;
    const now = Date.now();
    if (now - lastPhotoInputAtRef.current < 400) return;
    lastPhotoInputAtRef.current = now;
    processPhotoFiles(Array.from(fileList));
  }

  const photoButtonLabel = photoPickInProgress
    ? tCommon("loading")
    : (labels.photoLibrary ?? labels.photo);

  const visibleInstagramUrls =
    defaultInstagramField && instagramUrls.length === 0 ? [""] : instagramUrls;

  const hasPhotoTiles = visibleSavedUrls.length > 0 || newPhotoFiles.length > 0;

  return (
    <div className="space-y-4">
      {!hideMediaHint ? (
        <p className="text-xs text-slate-500">{labels.mediaHint}</p>
      ) : null}

      <div className="space-y-2">
        <input
          ref={photoLibraryInputRef}
          type="file"
          accept={PIN_PHOTO_GALLERY_ACCEPT}
          multiple={multiPhoto}
          className="hidden"
          onChange={(e) => handlePhotoInputChange(e.target.files)}
        />
        <div className={equalActionButtons ? "pin-form-actions" : "flex flex-wrap gap-2"}>
          <button
            type="button"
            disabled={!canAddPhotos || photoPickInProgress}
            onClick={openPhotoLibrary}
            className={
              equalActionButtons
                ? "pin-form-actions__btn pin-form-actions__btn--primary"
                : "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {photoButtonLabel}
          </button>
          <button
            type="button"
            onClick={addInstagramField}
            className={
              equalActionButtons
                ? "pin-form-actions__btn pin-form-actions__btn--secondary"
                : "rounded-lg border border-blue-600 bg-transparent px-4 py-2 text-sm font-medium text-blue-400 hover:bg-blue-600/10"
            }
          >
            {labels.addInstagram}
          </button>
        </div>

        {hasPhotoTiles ? (
          <ul className="pin-media-photo-grid">
            {visibleSavedUrls.map((url) => (
              <li key={url} className="pin-media-photo-grid__item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="pin-media-photo-grid__image" />
                <button
                  type="button"
                  className="pin-media-photo-grid__remove"
                  onClick={() => removeSavedPhoto(url)}
                  aria-label={labels.removePhoto}
                >
                  ✕
                </button>
                <span className="pin-media-photo-grid__badge">{labels.photoSaved}</span>
              </li>
            ))}
            {newPhotoFiles.map((file, index) => {
              const sniffed = pickedFileMimeRef.current.get(file) ?? null;
              const showPreview = canBrowserPreviewPinPhoto(file, sniffed);
              const previewUrl = showPreview ? pinPhotoPreviewObjectUrl(file) : null;
              return (
              <li key={`${file.name}-${file.size}-${file.lastModified}`} className="pin-media-photo-grid__item">
                {previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewUrl}
                    alt=""
                    className="pin-media-photo-grid__image"
                    decoding="async"
                  />
                ) : (
                  <div
                    className="pin-media-photo-grid__image pin-media-photo-grid__image--pending"
                    aria-label={labels.photo}
                  />
                )}
                <button
                  type="button"
                  className="pin-media-photo-grid__remove"
                  onClick={() => removeNewPhoto(index)}
                  aria-label={labels.removePhoto}
                >
                  ✕
                </button>
              </li>
            );
            })}
          </ul>
        ) : null}
      </div>

      <div className="space-y-2">
        {visibleInstagramUrls.length > 0 ? (
          <ul className="space-y-2">
            {visibleInstagramUrls.map((url, index) => (
              <li key={index} className="flex gap-2">
                <input
                  ref={
                    autoFocusInstagram && index === visibleInstagramUrls.length - 1
                      ? instagramDraftRef
                      : undefined
                  }
                  type="url"
                  value={url}
                  onChange={(e) => updateInstagramUrl(index, e.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                />
                {defaultInstagramField && visibleInstagramUrls.length === 1 && !url.trim() ? null : (
                  <button
                    type="button"
                    onClick={() => removeInstagramField(index)}
                    className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-white"
                    aria-label={labels.removeInstagram}
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {!hideInstagramHint ? (
          <p className="text-xs text-slate-500">{labels.instagramHint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function normalizePinInstagramUrls(
  instagramUrls: string[],
  isValidInstagramUrl: (url: string) => boolean
): { ok: true; instagram_urls: string[] } | { ok: false; error: string } {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const raw of instagramUrls) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (!isValidInstagramUrl(trimmed)) {
      return { ok: false, error: "Invalid Instagram post URL" };
    }

    const canonical = normalizeInstagramPostUrl(trimmed);
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(canonical);
  }

  return { ok: true, instagram_urls: normalized };
}

export async function buildPinMediaPayload(options: {
  savedPhotoUrls: string[];
  removedSavedPhotoUrls: string[];
  newPhotoFiles: File[];
  instagramUrls: string[];
  isValidInstagramUrl: (url: string) => boolean;
  formatPhotoUploadError: (message: string) => string;
  maxPinPhotos?: number;
}): Promise<
  | { ok: true; photo_url: string | null; photo_urls: string[]; instagram_urls: string[] }
  | { ok: false; error: string }
> {
  const instagramResult = normalizePinInstagramUrls(
    options.instagramUrls,
    options.isValidInstagramUrl
  );
  if (!instagramResult.ok) return instagramResult;

  const maxPinPhotos = options.maxPinPhotos ?? LIMITS.maxPinPhotos;
  const removed = new Set(options.removedSavedPhotoUrls);
  const photoUrls = options.savedPhotoUrls.filter((url) => !removed.has(url));

  for (const file of options.newPhotoFiles) {
    if (photoUrls.length >= maxPinPhotos) break;
    const uploaded = await uploadPinPhotoToR2(file, options.formatPhotoUploadError);
    if (!uploaded.ok) return uploaded;
    photoUrls.push(uploaded.url);
  }

  const capped = photoUrls.slice(0, maxPinPhotos);

  return {
    ok: true,
    photo_url: capped[0] ?? null,
    photo_urls: capped,
    instagram_urls: instagramResult.instagram_urls,
  };
}
