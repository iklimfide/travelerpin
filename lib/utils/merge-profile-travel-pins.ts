import { readInstagramUrls, readPhotoUrls, type PinMediaRow } from "@/lib/utils/pin-media";
import type { VisitedCity, VisitedPark } from "@/types/database";

function photoFields(row: PinMediaRow & { media_preview_url?: string | null }) {
  const urls = readPhotoUrls(row);
  return {
    photo_url: urls[0] ?? row.photo_url ?? null,
    photo_urls: urls.length > 0 ? urls : row.photo_urls ?? [],
    media_preview_url: row.media_preview_url ?? urls[0] ?? null,
  };
}

function mergeMediaFields<T extends VisitedCity | VisitedPark>(prev: T, incoming: T): T {
  const prevPhotos = readPhotoUrls(prev);
  const incPhotos = readPhotoUrls(incoming);
  const prevIg = readInstagramUrls(prev);
  const incIg = readInstagramUrls(incoming);

  const photos = incPhotos.length > 0 ? photoFields(incoming) : photoFields(prev);
  const instagram_urls = incIg.length > 0 ? incoming.instagram_urls : prev.instagram_urls;

  const hasPhoto = readPhotoUrls({ ...photos, instagram_urls: [] as string[] }).length > 0;
  const hasIg = readInstagramUrls({ instagram_urls }).length > 0;

  let media_type = incoming.media_type ?? prev.media_type;
  let media_url = incoming.media_url ?? prev.media_url;
  if (hasPhoto) {
    media_type = "photo";
    media_url = photos.photo_url;
  } else if (hasIg) {
    media_type = "instagram";
    media_url = readInstagramUrls({ instagram_urls })[0] ?? null;
  }

  return {
    ...prev,
    ...incoming,
    ...photos,
    instagram_urls,
    media_type,
    media_url,
    note: incoming.note ?? prev.note,
  };
}

export function mergeVisitedCityRows(prev: VisitedCity, incoming: VisitedCity): VisitedCity {
  return mergeMediaFields(prev, incoming);
}

export function mergeVisitedParkRows(prev: VisitedPark, incoming: VisitedPark): VisitedPark {
  return mergeMediaFields(prev, incoming);
}

export function mergeVisitedCitiesById(
  prev: VisitedCity[],
  incoming: VisitedCity[]
): VisitedCity[] {
  const prevById = new Map(prev.map((city) => [city.id, city]));
  const seen = new Set<string>();
  const result: VisitedCity[] = [];

  for (const city of incoming) {
    seen.add(city.id);
    const existing = prevById.get(city.id);
    result.push(existing ? mergeVisitedCityRows(existing, city) : city);
  }

  for (const city of prev) {
    if (!seen.has(city.id)) result.push(city);
  }

  return result;
}

export function mergeVisitedParksById(prev: VisitedPark[], incoming: VisitedPark[]): VisitedPark[] {
  const prevById = new Map(prev.map((park) => [park.id, park]));
  const seen = new Set<string>();
  const result: VisitedPark[] = [];

  for (const park of incoming) {
    seen.add(park.id);
    const existing = prevById.get(park.id);
    result.push(existing ? mergeVisitedParkRows(existing, park) : park);
  }

  for (const park of prev) {
    if (!seen.has(park.id)) result.push(park);
  }

  return result;
}

/** Collapse duplicate city keys — combine photo + Instagram from both rows when possible. */
export function mergeDuplicateVisitedCityRows(a: VisitedCity, b: VisitedCity): VisitedCity {
  const aMedia = readPhotoUrls(a).length + readInstagramUrls(a).length;
  const bMedia = readPhotoUrls(b).length + readInstagramUrls(b).length;
  if (aMedia === 0) return b;
  if (bMedia === 0) return a;
  return mergeVisitedCityRows(a, b);
}
