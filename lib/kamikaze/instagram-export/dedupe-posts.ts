import type { ParsedInstagramPost } from "@/lib/kamikaze/instagram-export/post-utils";
import { normalizeInstagramPostUrl } from "@/lib/utils/instagram";

function normalizeExportUri(uri: string): string {
  return uri.replace(/^\.\//, "").replace(/\\/g, "/").split("?")[0].toLowerCase();
}

export function dedupeKeyForInstagramPost(post: ParsedInstagramPost): string {
  if (post.permalink) {
    return `permalink:${normalizeInstagramPostUrl(post.permalink).toLowerCase()}`;
  }
  const uris = post.frames.map((f) => normalizeExportUri(f.uri)).filter(Boolean).sort();
  if (uris.length > 0) {
    return `frames:${uris.join("\0")}`;
  }
  return `file:${post.sourceFile}:${post.caption ?? ""}`;
}

/** Meta often ships the same posts in both posts_1.json and posts.json — keep one. */
export function dedupeParsedInstagramPosts(posts: ParsedInstagramPost[]): ParsedInstagramPost[] {
  const seen = new Set<string>();
  const out: ParsedInstagramPost[] = [];

  for (const post of posts) {
    const key = dedupeKeyForInstagramPost(post);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(post);
  }

  return out;
}

export function dedupeFrameUrisInPosts(posts: ParsedInstagramPost[]): ParsedInstagramPost[] {
  return posts.map((post) => {
    const seen = new Set<string>();
    const frames = post.frames.filter((frame) => {
      const key = normalizeExportUri(frame.uri);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return frames.length === post.frames.length ? post : { ...post, frames };
  }).filter((post) => post.frames.length > 0);
}
