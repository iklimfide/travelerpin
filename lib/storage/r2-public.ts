function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;

  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

/** Server + client (via NEXT_PUBLIC_) base URL for stored R2 media links. */
export function getR2PublicBaseUrl(): string | undefined {
  return readEnv("R2_PUBLIC_BASE_URL") ?? readEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL");
}

export function validateR2PublicBaseUrl(): string | null {
  const publicBaseUrl = getR2PublicBaseUrl();
  if (!publicBaseUrl) return "R2_PUBLIC_BASE_URL is missing";

  try {
    const hostname = new URL(publicBaseUrl).hostname;
    if (hostname.endsWith(".r2.cloudflarestorage.com")) {
      return "R2_PUBLIC_BASE_URL must be the public bucket URL (pub-….r2.dev or your custom domain), not the S3 API endpoint.";
    }
  } catch {
    return "R2_PUBLIC_BASE_URL is not a valid URL";
  }

  return null;
}

export function isSafeR2ObjectKey(key: string): boolean {
  if (!key || key.length > 512) return false;
  if (key.includes("..") || key.startsWith("/")) return false;
  return key.includes("/");
}

export function isR2PublicMediaUrl(publicUrl: string): boolean {
  try {
    const parsed = new URL(publicUrl);
    if (parsed.protocol !== "https:") return false;

    if (parsed.hostname.endsWith(".r2.dev")) {
      return true;
    }

    const publicBaseUrl = getR2PublicBaseUrl();
    if (publicBaseUrl) {
      const base = publicBaseUrl.replace(/\/$/, "");
      return publicUrl.startsWith(`${base}/`);
    }
  } catch {
    return false;
  }

  return false;
}

/** Known public media prefixes in the R2 bucket. */
const R2_MEDIA_KEY_PREFIXES = ["avatars/", "city-heroes/", "park-heroes/", "covers/"] as const;

function isR2MediaKey(key: string): boolean {
  return R2_MEDIA_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)) && isSafeR2ObjectKey(key);
}

/** Parse object key from a public R2 URL (works on client for pub-*.r2.dev links). */
export function parseR2ObjectKey(publicUrl: string): string | null {
  try {
    if (!publicUrl.startsWith("/")) {
      const key = decodeURIComponent(new URL(publicUrl).pathname.replace(/^\//, ""));
      if (isR2MediaKey(key)) {
        return key;
      }
    }
  } catch {
    // fall through to hostname-based parsing
  }

  if (!isR2PublicMediaUrl(publicUrl)) return null;

  try {
    const key = decodeURIComponent(new URL(publicUrl).pathname.replace(/^\//, ""));
    return isSafeR2ObjectKey(key) ? key : null;
  } catch {
    return null;
  }
}

export function getR2PublicHostname(): string | null {
  const publicBaseUrl = getR2PublicBaseUrl();
  if (!publicBaseUrl) return null;

  try {
    return new URL(publicBaseUrl).hostname;
  } catch {
    return null;
  }
}

/** Stored public object URL (uploads). Browsers load via hubPhotoProxyPath instead. */
export function publicR2ObjectUrl(key: string, cacheBuster?: string | null): string | null {
  if (!isSafeR2ObjectKey(key)) return null;
  const publicBaseUrl = getR2PublicBaseUrl();
  if (!publicBaseUrl) return null;

  const origin = publicBaseUrl.replace(/\/$/, "");
  const url = new URL(`${origin}/${key}`);
  if (cacheBuster) url.searchParams.set("v", cacheBuster);
  return url.href;
}

/** Same-origin image src. r2.dev is not reachable from many client networks. */
export function hubPhotoProxyPath(key: string, cacheBuster?: string | null): string {
  const params = new URLSearchParams();
  params.set("key", key);
  if (cacheBuster) params.set("v", cacheBuster);
  return `/api/hub-photo?${params.toString()}`;
}

export function parseHubPhotoProxyRequest(
  mediaUrl: string
): { key: string; cacheBuster: string | null } | null {
  try {
    const parsed = mediaUrl.startsWith("/")
      ? new URL(mediaUrl, "https://travelerpin.invalid")
      : new URL(mediaUrl);
    if (!parsed.pathname.endsWith("/api/hub-photo")) return null;

    const key = parsed.searchParams.get("key")?.trim() ?? "";
    if (!isSafeR2ObjectKey(key)) return null;
    return {
      key,
      cacheBuster: parsed.searchParams.get("v")?.trim() || null,
    };
  } catch {
    return null;
  }
}

/** Read ?v= cache-buster from stored media URLs (hero uploads append this on each replace). */
export function readMediaCacheBuster(publicUrl: string): string | null {
  try {
    const parsed = publicUrl.startsWith("http")
      ? new URL(publicUrl)
      : new URL(publicUrl, "https://example.invalid");
    const value = parsed.searchParams.get("v")?.trim();
    return value || null;
  } catch {
    return null;
  }
}
