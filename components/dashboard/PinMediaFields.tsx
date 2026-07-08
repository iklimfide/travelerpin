import { useEffect, useRef } from "react";
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
  savedPhotoUrl: string | null;
  photoFile: File | null;
  onPhotoFileChange: (file: File | null) => void;
  removePhoto: boolean;
  onRemovePhotoChange: (remove: boolean) => void;
  instagramUrls: string[];
  onInstagramUrlsChange: (urls: string[]) => void;
  /** Opens with an empty Instagram field focused (e.g. from “Add your Instagram link”). */
  autoFocusInstagram?: boolean;
  hideInstagramHint?: boolean;
  /** Keeps at least one empty Instagram field visible (profile edit modals). */
  defaultInstagramField?: boolean;
  /** Center action buttons in two equal columns (profile edit modals). */
  equalActionButtons?: boolean;
  hideMediaHint?: boolean;
};

export function PinMediaFields({
  labels,
  savedPhotoUrl,
  photoFile,
  onPhotoFileChange,
  removePhoto,
  onRemovePhotoChange,
  instagramUrls,
  onInstagramUrlsChange,
  autoFocusInstagram = false,
  hideInstagramHint = false,
  defaultInstagramField = false,
  equalActionButtons = false,
  hideMediaHint = false,
}: PinMediaFieldsProps) {
  const showSavedPhoto = Boolean(savedPhotoUrl) && !removePhoto && !photoFile;
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

  const visibleInstagramUrls =
    defaultInstagramField && instagramUrls.length === 0 ? [""] : instagramUrls;

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
          className="hidden"
          onChange={(e) => {
            onRemovePhotoChange(false);
            onPhotoFileChange(e.target.files?.[0] ?? null);
          }}
        />
        <div className={equalActionButtons ? "pin-form-actions" : "flex flex-wrap gap-2"}>
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className={
              equalActionButtons
                ? "pin-form-actions__btn pin-form-actions__btn--primary"
                : "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
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
        {photoFile ? (
          <p className="text-xs text-emerald-400">{photoFile.name}</p>
        ) : showSavedPhoto ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-slate-500">{labels.photoSaved}</p>
            <button
              type="button"
              onClick={() => onRemovePhotoChange(true)}
              className="text-xs text-red-400 hover:text-red-300"
            >
              {labels.removePhoto}
            </button>
          </div>
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
  photoFile: File | null;
  savedPhotoUrl: string | null;
  removePhoto: boolean;
  instagramUrls: string[];
  isValidInstagramUrl: (url: string) => boolean;
  formatPhotoUploadError: (message: string) => string;
}): Promise<
  | { ok: true; photo_url: string | null; instagram_urls: string[] }
  | { ok: false; error: string }
> {
  let photoUrl: string | null = options.removePhoto ? null : options.savedPhotoUrl;

  if (options.photoFile) {
    const formData = new FormData();
    formData.append("file", options.photoFile);
    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (!uploadRes.ok) {
      const data = await uploadRes.json();
      return { ok: false, error: options.formatPhotoUploadError(data.error) };
    }
    const { url } = await uploadRes.json();
    photoUrl = url;
  }

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
    photo_url: photoUrl,
    instagram_urls: instagramUrls,
  };
}
