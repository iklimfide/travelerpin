import type { MediaType } from "@/types/database";
import { LIMITS } from "@/lib/constants";
import { isValidInstagramUrl, normalizeInstagramPostUrl } from "@/lib/utils/instagram";

export type PinMediaRow = {
  photo_url?: string | null;
  photo_urls?: string[] | null;
  instagram_urls?: string[] | null;
  media_type?: MediaType | null;
  media_url?: string | null;
};

export type PinMediaInput = PinMediaRow & {
  instagram_urls?: string[] | null;
  photo_urls?: string[] | null;
};

export function readPhotoUrls(row: PinMediaRow | null | undefined): string[] {
  if (!row) return [];

  const fromArray = (row.photo_urls ?? []).map((url) => url?.trim()).filter(Boolean) as string[];
  if (fromArray.length > 0) {
    return fromArray.slice(0, LIMITS.maxPinPhotos);
  }

  if (row.photo_url?.trim()) {
    return [row.photo_url.trim()];
  }

  if (row.media_type === "photo" && row.media_url?.trim()) {
    return [row.media_url.trim()];
  }

  return [];
}

export function readPhotoUrl(row: PinMediaRow | null | undefined): string | null {
  return readPhotoUrls(row)[0] ?? null;
}

export function readInstagramUrls(row: PinMediaRow | null | undefined): string[] {
  if (!row) return [];
  if (row.instagram_urls && row.instagram_urls.length > 0) {
    return row.instagram_urls.filter((url) => Boolean(url?.trim()));
  }
  if (row.media_type === "instagram" && row.media_url) {
    return [row.media_url];
  }
  return [];
}

/** Ensures at least one empty Instagram URL field for paste-ready editing. */
export function withInstagramDraftField(urls: string[]): string[] {
  if (urls.some((url) => !url.trim())) return urls;
  return [...urls, ""];
}

export function pinHasMedia(row: PinMediaRow | null | undefined): boolean {
  return readPhotoUrls(row).length > 0 || readInstagramUrls(row).length > 0;
}

export function activePinPhotoCount(options: {
  savedPhotoUrls: string[];
  removedSavedPhotoUrls: string[];
  newPhotoFiles: File[];
}): number {
  const removed = new Set(options.removedSavedPhotoUrls);
  const keptSaved = options.savedPhotoUrls.filter((url) => !removed.has(url)).length;
  return keptSaved + options.newPhotoFiles.length;
}

/** True when a save changed the pin's uploaded photos (upload, replace, or remove). */
export function pinPhotoMediaChanged(input: {
  savedPhotoUrls: string[];
  removedSavedPhotoUrls: string[];
  newPhotoFiles: File[];
  previousPhotoUrls: string[];
  nextPhotoUrls: string[];
}): boolean {
  if (input.newPhotoFiles.length > 0) return true;
  if (input.removedSavedPhotoUrls.length > 0) return true;

  const prev = input.previousPhotoUrls.join("\0");
  const next = input.nextPhotoUrls.join("\0");
  return prev !== next;
}

export function normalizeInstagramUrlList(urls: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of urls ?? []) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (!isValidInstagramUrl(trimmed)) continue;

    const canonical = normalizeInstagramPostUrl(trimmed);
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(canonical);
  }

  return result;
}

export async function resolvePinMediaFields(data: PinMediaInput): Promise<{
  photo_url: string | null;
  photo_urls: string[];
  instagram_urls: string[];
  media_type: MediaType | null;
  media_url: string | null;
  media_preview_url: string | null;
}> {
  let photoUrls = (data.photo_urls ?? [])
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, LIMITS.maxPinPhotos);

  if (photoUrls.length === 0) {
    const legacy = data.photo_url?.trim();
    if (legacy) photoUrls = [legacy];
  }

  let instagramUrls = normalizeInstagramUrlList(data.instagram_urls);

  if (instagramUrls.length === 0 && data.media_type === "instagram" && data.media_url?.trim()) {
    instagramUrls = normalizeInstagramUrlList([data.media_url]);
  }

  const photoUrl = photoUrls[0] ?? null;

  return {
    photo_url: photoUrl,
    photo_urls: photoUrls,
    instagram_urls: instagramUrls,
    media_type: photoUrl ? "photo" : instagramUrls.length > 0 ? "instagram" : null,
    media_url: photoUrl ?? instagramUrls[0] ?? null,
    media_preview_url: photoUrl,
  };
}
