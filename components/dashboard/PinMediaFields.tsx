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
}: PinMediaFieldsProps) {
  const showSavedPhoto = Boolean(savedPhotoUrl) && !removePhoto && !photoFile;

  function updateInstagramUrl(index: number, value: string) {
    const next = [...instagramUrls];
    next[index] = value;
    onInstagramUrlsChange(next);
  }

  function addInstagramField() {
    onInstagramUrlsChange([...instagramUrls, ""]);
  }

  function removeInstagramField(index: number) {
    onInstagramUrlsChange(instagramUrls.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{labels.mediaHint}</p>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-300">{labels.photo}</p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            onRemovePhotoChange(false);
            onPhotoFileChange(e.target.files?.[0] ?? null);
          }}
          className="text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:text-white"
        />
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
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-300">{labels.instagram}</p>
          <button
            type="button"
            onClick={addInstagramField}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {labels.addInstagram}
          </button>
        </div>
        {instagramUrls.length > 0 ? (
          <ul className="space-y-2">
            {instagramUrls.map((url, index) => (
              <li key={index} className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateInstagramUrl(index, e.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeInstagramField(index)}
                  className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-white"
                  aria-label={labels.removeInstagram}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-slate-500">{labels.instagramHint}</p>
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
