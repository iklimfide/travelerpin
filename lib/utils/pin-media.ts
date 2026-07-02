import type { MediaType } from "@/types/database";
import { isValidInstagramUrl, normalizeInstagramPostUrl } from "@/lib/utils/instagram";

export type PinMediaRow = {
  photo_url?: string | null;
  instagram_urls?: string[] | null;
  media_type?: MediaType | null;
  media_url?: string | null;
};

export type PinMediaInput = PinMediaRow & {
  instagram_urls?: string[] | null;
};

export function readPhotoUrl(row: PinMediaRow | null | undefined): string | null {
  if (!row) return null;
  if (row.photo_url) return row.photo_url;
  if (row.media_type === "photo" && row.media_url) return row.media_url;
  return null;
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

export function pinHasMedia(row: PinMediaRow | null | undefined): boolean {
  return Boolean(readPhotoUrl(row)) || readInstagramUrls(row).length > 0;
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
  instagram_urls: string[];
  media_type: MediaType | null;
  media_url: string | null;
  media_preview_url: string | null;
}> {
  let photoUrl = data.photo_url?.trim() || null;
  let instagramUrls = normalizeInstagramUrlList(data.instagram_urls);

  if (instagramUrls.length === 0 && data.media_type === "instagram" && data.media_url?.trim()) {
    instagramUrls = normalizeInstagramUrlList([data.media_url]);
  }

  if (!photoUrl && data.media_type === "photo" && data.media_url?.trim()) {
    photoUrl = data.media_url.trim();
  }

  if (photoUrl) {
    try {
      new URL(photoUrl);
    } catch {
      photoUrl = null;
    }
  }

  return {
    photo_url: photoUrl,
    instagram_urls: instagramUrls,
    media_type: photoUrl ? "photo" : instagramUrls.length > 0 ? "instagram" : null,
    media_url: photoUrl ?? instagramUrls[0] ?? null,
    media_preview_url: photoUrl,
  };
}
