import type { LocationMap } from "@/lib/kamikaze/instagram-export/resolve-city";

/** Generic IG tags — not used for city inference. */
const IGNORED_HASHTAG_TAGS = new Set(
  [
    "travel",
    "travelling",
    "traveling",
    "travelgram",
    "travelphotography",
    "instatravel",
    "vacation",
    "holiday",
    "trip",
    "wanderlust",
    "explore",
    "adventure",
    "photography",
    "photo",
    "photooftheday",
    "picoftheday",
    "instagood",
    "instagram",
    "instadaily",
    "reels",
    "reel",
    "love",
    "beautiful",
    "nature",
    "summer",
    "winter",
    "spring",
    "autumn",
    "fall",
    "tbt",
    "throwback",
    "memories",
    "friends",
    "family",
    "selfie",
    "food",
    "foodie",
    "fitness",
    "workout",
    "ootd",
    "lifestyle",
    "happy",
    "smile",
    "sunset",
    "sunrise",
    "beach",
    "mountains",
    "city",
    "turkey",
    "türkiye",
    "turkiye",
  ].map((t) => t.toLowerCase())
);

export function normalizeHashtagKey(raw: string): string {
  return raw.trim().replace(/^#+/, "").toLowerCase();
}

export function extractHashtagsFromText(text: string | null | undefined): string[] {
  if (!text || typeof text !== "string") return [];
  const matches = text.match(/#[\p{L}\p{N}_]+/gu);
  if (!matches) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of matches) {
    const key = normalizeHashtagKey(token);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function isPlaceLikeHashtag(tag: string): boolean {
  const key = normalizeHashtagKey(tag);
  if (key.length < 2 || key.length > 48) return false;
  if (/^\d+$/.test(key)) return false;
  if (IGNORED_HASHTAG_TAGS.has(key)) return false;
  return true;
}

export function filterPlaceHashtags(tags: string[]): string[] {
  return tags.filter(isPlaceLikeHashtag);
}

/** Merge hashtag → city entries into a location map (keys: lowercase tag, no #). */
export function mergeHashtagJsonIntoLocationMap(
  locationMap: LocationMap,
  hashtagJson: string | Record<string, unknown> | null | undefined
): LocationMap {
  if (!hashtagJson) return locationMap;
  let parsed: Record<string, unknown>;
  if (typeof hashtagJson === "string") {
    const trimmed = hashtagJson.trim();
    if (!trimmed) return locationMap;
    try {
      parsed = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return locationMap;
    }
  } else {
    parsed = hashtagJson;
  }

  const merged: LocationMap = { ...locationMap };
  for (const [rawKey, value] of Object.entries(parsed)) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    const city_name = typeof row.city_name === "string" ? row.city_name.trim() : "";
    const country_code =
      typeof row.country_code === "string" ? row.country_code.trim().toUpperCase() : "";
    const country_name =
      typeof row.country_name === "string" ? row.country_name.trim() : country_code;
    if (!city_name || !country_code) continue;
    const key = normalizeHashtagKey(rawKey);
    merged[key] = { city_name, country_code, country_name };
    merged[`#${key}`] = { city_name, country_code, country_name };
  }
  return merged;
}

export type HashtagFrequency = { tag: string; count: number };

export function topHashtagCounts(
  posts: Array<{ hashtags: string[] }>,
  limit = 25
): HashtagFrequency[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of filterPlaceHashtags(post.hashtags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
