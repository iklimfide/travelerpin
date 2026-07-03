const INSTAGRAM_POST_REGEX =
  /instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/;
const INSTAGRAM_PROFILE_REGEX =
  /^https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|reel\/|tv\/|stories\/)([A-Za-z0-9._]{1,30})\/?$/i;

export function parseInstagramPostUrl(url: string): string | null {
  const match = url.match(INSTAGRAM_POST_REGEX);
  return match ? match[2] : null;
}

export function toInstagramEmbedUrl(postUrl: string): string | null {
  const shortcode = parseInstagramPostUrl(postUrl);
  if (!shortcode) return null;
  return `https://www.instagram.com/p/${shortcode}/embed`;
}

export function isValidInstagramUrl(url: string): boolean {
  return INSTAGRAM_POST_REGEX.test(url);
}

/** Canonical post URL without tracking query params. */
export function normalizeInstagramPostUrl(url: string): string {
  const shortcode = parseInstagramPostUrl(url);
  if (!shortcode) return url.trim();
  return `https://www.instagram.com/p/${shortcode}/`;
}

export const INSTAGRAM_PROFILE_PREFIX = "https://www.instagram.com/";

export function parseInstagramProfileUrl(url: string): string | null {
  const trimmed = url.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^@/, "instagram.com/")}`;

  try {
    const parsed = new URL(withProtocol);
    const normalized = `https://${parsed.hostname}${parsed.pathname}`;
    const match = normalized.match(INSTAGRAM_PROFILE_REGEX);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** Username only — strips pasted profile URLs so the prefix is never doubled. */
export function instagramUsernameFromInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const fromUrl = parseInstagramProfileUrl(trimmed);
  if (fromUrl) return fromUrl;

  const withoutPrefix = trimmed
    .replace(/^https?:\/\/(?:www\.)?instagram\.com\/+/i, "")
    .replace(/^@+/, "")
    .split(/[/?#]/)[0] ?? "";

  return withoutPrefix.replace(/[^A-Za-z0-9._]/g, "").slice(0, 30);
}

export function buildInstagramProfileUrl(username: string): string | null {
  const clean = instagramUsernameFromInput(username);
  return clean ? `${INSTAGRAM_PROFILE_PREFIX}${clean}/` : null;
}

export function normalizeInstagramProfileUrl(url: string): string | null {
  const username = parseInstagramProfileUrl(url) ?? instagramUsernameFromInput(url);
  return username ? `${INSTAGRAM_PROFILE_PREFIX}${username}/` : null;
}

export function isValidInstagramProfileUrl(url: string): boolean {
  return normalizeInstagramProfileUrl(url) != null;
}

export function isInstagramCdnUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.includes("cdninstagram.com") || host.includes("fbcdn.net");
  } catch {
    return false;
  }
}
