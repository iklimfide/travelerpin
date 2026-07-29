import fs from "node:fs";
import path from "node:path";
import { extractHashtagsFromText } from "@/lib/kamikaze/instagram-export/hashtags";
import { dedupeFrameUrisInPosts, dedupeParsedInstagramPosts } from "@/lib/kamikaze/instagram-export/dedupe-posts";
import { findInstagramPermalink, isPhotoExportUri, type ParsedInstagramPost } from "@/lib/kamikaze/instagram-export/post-utils";

export type { ParsedInstagramPost, ParsedInstagramFrame } from "@/lib/kamikaze/instagram-export/post-utils";
export { resolveMediaAbsolutePath } from "@/lib/kamikaze/instagram-export/post-utils";

function shouldSkipDuplicateMetaPostsJson(filePath: string, allCandidates: string[]): boolean {
  const base = path.basename(filePath).toLowerCase();
  const dir = path.dirname(filePath);
  const skipPairs = [
    ["posts.json", "posts_1.json"],
    ["reels.json", "reels_1.json"],
    ["archived_posts.json", "archived_posts_1.json"],
  ];
  for (const [dup, canonical] of skipPairs) {
    if (base !== dup) continue;
    if (allCandidates.some((other) => path.dirname(other) === dir && path.basename(other).toLowerCase() === canonical)) {
      return true;
    }
  }
  return false;
}

export function collectPostJsonFiles(exportRoot: string): string[] {
  const results: string[] = [];
  const prefer = [
    path.join(exportRoot, "your_instagram_activity", "media"),
    path.join(exportRoot, "content"),
    exportRoot,
  ];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".json")) continue;
      if (entry.name.endsWith(".json.xz")) continue;
      const lower = entry.name.toLowerCase();
      if (
        lower.includes("posts") ||
        lower.includes("reels") ||
        lower.includes("archived") ||
        lower.includes("igtv") ||
        lower === "other_content.json"
      ) {
        results.push(full);
      }
    }
  }

  for (const base of prefer) walk(base);
  const unique = [...new Set(results)];
  return unique.filter((file) => !shouldSkipDuplicateMetaPostsJson(file, unique));
}

function mediaListFromPost(post: Record<string, unknown>): unknown[] {
  const direct = post.media;
  if (Array.isArray(direct) && direct.length > 0) {
    return direct;
  }

  const labels = post.label_values;
  if (!Array.isArray(labels)) return [];

  for (const row of labels) {
    if (!row || typeof row !== "object") continue;
    const nested = (row as { media?: unknown }).media;
    if (Array.isArray(nested) && nested.length > 0) {
      return nested;
    }
  }

  return [];
}

function extractCaptionFromPost(post: Record<string, unknown>): string | null {
  const direct = [post.title, post.caption];
  for (const raw of direct) {
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }

  const labels = post.label_values;
  if (!Array.isArray(labels)) return null;

  for (const row of labels) {
    if (!row || typeof row !== "object") continue;
    const label = String((row as { label?: unknown }).label ?? "").toLowerCase();
    const value = (row as { value?: unknown }).value;
    if (typeof value !== "string" || !value.trim()) continue;
    if (label.includes("caption") || label.includes("açıklama") || label === "title") {
      return value.trim();
    }
  }

  for (const row of labels) {
    if (!row || typeof row !== "object") continue;
    const value = (row as { value?: unknown }).value;
    if (typeof value === "string" && value.includes("#") && value.trim().length <= 2200) {
      return value.trim();
    }
  }

  return null;
}

function extractLocationLabel(post: Record<string, unknown>): string | null {
  const candidates = [post.location, post.location_name, post.title, post.caption];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > 120) continue;
    if (/^https?:\/\//i.test(trimmed)) continue;
    if (trimmed.includes("#") && trimmed.length > 80) continue;
    if (/,\s*[A-Za-z]{2,}/.test(trimmed) || /,\s/.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

function extractExifLatLon(mediaObj: Record<string, unknown> | null): {
  latitude: number;
  longitude: number;
} | null {
  if (!mediaObj) return null;
  const meta = mediaObj.media_metadata as Record<string, unknown> | undefined;
  const photoMeta = meta?.photo_metadata as Record<string, unknown> | undefined;
  const videoMeta = meta?.video_metadata as Record<string, unknown> | undefined;
  const exif = (photoMeta?.exif_data ?? videoMeta?.exif_data) as unknown;
  if (!Array.isArray(exif) || exif.length === 0) return null;
  for (const row of exif) {
    if (!row || typeof row !== "object") continue;
    const lat = Number((row as { latitude?: number }).latitude);
    const lon = Number((row as { longitude?: number }).longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
      return { latitude: lat, longitude: lon };
    }
  }
  return null;
}

export function parsePostsFromJsonFile(filePath: string): ParsedInstagramPost[] {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }

  const list = Array.isArray(data)
    ? data
    : (data as { posts?: unknown; ig_posts?: unknown; media?: unknown })?.posts ??
      (data as { ig_posts?: unknown }).ig_posts ??
      (data as { media?: unknown }).media ??
      null;

  if (!Array.isArray(list)) return [];

  const posts: ParsedInstagramPost[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const post = item as Record<string, unknown>;
    const mediaList = mediaListFromPost(post);
    if (mediaList.length === 0) continue;

    const frames = [];
    for (const media of mediaList) {
      if (!media || typeof media !== "object") continue;
      const mediaObj = media as Record<string, unknown>;
      const uri = mediaObj.uri;
      if (typeof uri !== "string" || !uri.trim() || !isPhotoExportUri(uri)) continue;
      frames.push({
        uri: uri.trim(),
        exif: extractExifLatLon(mediaObj),
        timestamp:
          (typeof mediaObj.creation_timestamp === "number"
            ? mediaObj.creation_timestamp
            : null) ??
          (typeof post.creation_timestamp === "number" ? post.creation_timestamp : null),
      });
    }

    if (frames.length === 0) continue;

    const caption = extractCaptionFromPost(post);
    posts.push({
      sourceFile: filePath,
      permalink: findInstagramPermalink(post),
      locationLabel: extractLocationLabel(post),
      caption,
      hashtags: extractHashtagsFromText(caption),
      frames,
      exif: frames.map((f) => f.exif).find(Boolean) ?? null,
    });
  }

  return posts;
}

export function parseInstagramExportDirectory(exportRoot: string): ParsedInstagramPost[] {
  const jsonFiles = collectPostJsonFiles(exportRoot);
  const posts: ParsedInstagramPost[] = [];
  for (const file of jsonFiles) {
    posts.push(...parsePostsFromJsonFile(file));
  }
  return dedupeFrameUrisInPosts(dedupeParsedInstagramPosts(posts));
}
