import { useEffect, useMemo, useRef } from "react";
import { LIMITS } from "@/lib/constants";
import { activePinPhotoCount } from "@/lib/utils/pin-media";
import { normalizeInstagramPostUrl } from "@/lib/utils/instagram";

type PinMediaFieldsProps = {
  labels: {
    mediaHint: string;
    photo: string;
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
};

async function uploadPinPhotoFile(
  file: File,
  formatPhotoUploadError: (message: string) => string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const uploadRes = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  if (!uploadRes.ok) {
    const data = await uploadRes.json();
    return { ok: false, error: formatPhotoUploadError(data.error) };
  }
  const { url } = await uploadRes.json();
  return { ok: true, url: url as string };
}

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
}: PinMediaFieldsProps) {
  const removedSet = useMemo(() => new Set(removedSavedPhotoUrls), [removedSavedPhotoUrls]);
  const visibleSavedUrls = savedPhotoUrls.filter((url) => !removedSet.has(url));
  const photoCount = activePinPhotoCount({
    savedPhotoUrls,
    removedSavedPhotoUrls,
    newPhotoFiles,
  });
  const canAddPhotos = photoCount < LIMITS.maxPinPhotos;
  const remainingSlots = LIMITS.maxPinPhotos - photoCount;

  const instagramDraftRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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
    if (removedSet.has(url)) return;
    onRemovedSavedPhotoUrlsChange([...removedSavedPhotoUrls, url]);
  }

  function removeNewPhoto(index: number) {
    onNewPhotoFilesChange(newPhotoFiles.filter((_, i) => i !== index));
  }

  function handlePhotoInputChange(fileList: FileList | null) {
    if (!fileList?.length) return;
    const incoming = Array.from(fileList).slice(0, remainingSlots);
    if (incoming.length === 0) return;
    onNewPhotoFilesChange([...newPhotoFiles, ...incoming]);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

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
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handlePhotoInputChange(e.target.files)}
        />
        <div className={equalActionButtons ? "pin-form-actions" : "flex flex-wrap gap-2"}>
          <button
            type="button"
            disabled={!canAddPhotos}
            onClick={() => photoInputRef.current?.click()}
            className={
              equalActionButtons
                ? "pin-form-actions__btn pin-form-actions__btn--primary"
                : "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {labels.photo}
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
            {newPhotoFiles.map((file, index) => (
              <li key={`${file.name}-${index}`} className="pin-media-photo-grid__item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="pin-media-photo-grid__image"
                />
                <button
                  type="button"
                  className="pin-media-photo-grid__remove"
                  onClick={() => removeNewPhoto(index)}
                  aria-label={labels.removePhoto}
                >
                  ✕
                </button>
              </li>
            ))}
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

export async function buildPinMediaPayload(options: {
  savedPhotoUrls: string[];
  removedSavedPhotoUrls: string[];
  newPhotoFiles: File[];
  instagramUrls: string[];
  isValidInstagramUrl: (url: string) => boolean;
  formatPhotoUploadError: (message: string) => string;
}): Promise<
  | { ok: true; photo_url: string | null; photo_urls: string[]; instagram_urls: string[] }
  | { ok: false; error: string }
> {
  const removed = new Set(options.removedSavedPhotoUrls);
  const photoUrls = options.savedPhotoUrls.filter((url) => !removed.has(url));

  for (const file of options.newPhotoFiles) {
    if (photoUrls.length >= LIMITS.maxPinPhotos) break;
    const uploaded = await uploadPinPhotoFile(file, options.formatPhotoUploadError);
    if (!uploaded.ok) return uploaded;
    photoUrls.push(uploaded.url);
  }

  const capped = photoUrls.slice(0, LIMITS.maxPinPhotos);

  const instagramUrls: string[] = [];
  const seen = new Set<string>();

  for (const raw of options.instagramUrls) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (!options.isValidInstagramUrl(trimmed)) {
      return { ok: false, error: "Invalid Instagram post URL" };
    }

    const canonical = normalizeInstagramPostUrl(trimmed);
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    instagramUrls.push(canonical);
  }

  return {
    ok: true,
    photo_url: capped[0] ?? null,
    photo_urls: capped,
    instagram_urls: instagramUrls,
  };
}
