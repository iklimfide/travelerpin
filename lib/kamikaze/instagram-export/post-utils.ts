import fs from "node:fs";
import path from "node:path";

const PHOTO_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);

export type ParsedInstagramFrame = {
  uri: string;
  exif: { latitude: number; longitude: number } | null;
  timestamp: number | null;
};

export type ParsedInstagramPost = {
  sourceFile: string;
  permalink: string | null;
  locationLabel: string | null;
  caption: string | null;
  hashtags: string[];
  frames: ParsedInstagramFrame[];
  exif: { latitude: number; longitude: number } | null;
};

export function isPhotoExportUri(uri: string): boolean {
  const ext = path.extname(uri.split("?")[0]).toLowerCase();
  return PHOTO_EXT.has(ext);
}

export function findInstagramPermalink(value: unknown, depth = 0): string | null {
  if (depth > 8 || value == null) return null;
  if (typeof value === "string") {
    const match = value.match(
      /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[A-Za-z0-9_-]+\/?/
    );
    return match ? match[0].replace(/\/?$/, "/") : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findInstagramPermalink(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const key of Object.keys(value as object)) {
      const found = findInstagramPermalink((value as Record<string, unknown>)[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

export function resolveMediaAbsolutePath(exportRoot: string, uri: string): string | null {
  if (!uri || typeof uri !== "string") return null;
  const cleaned = uri.replace(/^\.\//, "").replace(/\\/g, "/");
  const candidates = [
    path.join(exportRoot, cleaned),
    path.join(exportRoot, cleaned.replace(/^media\//, "public-media/")),
    path.join(exportRoot, "your_instagram_activity", cleaned),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}
