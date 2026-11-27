/** True when the request carries a Supabase auth session cookie. */
export function hasSupabaseAuthCookie(
  cookies: { name: string }[] | { getAll(): { name: string }[] }
): boolean {
  const list = Array.isArray(cookies) ? cookies : cookies.getAll();
  return list.some((cookie) => isAuthTokenCookieName(cookie.name));
}

function isAuthTokenCookieName(name: string): boolean {
  return name.includes("auth-token") && !name.includes("code-verifier");
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

function readJwtExp(accessToken: string): number | null {
  const payload = accessToken.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown };
    return typeof claims.exp === "number" ? claims.exp : null;
  } catch {
    return null;
  }
}

function parseExpiresAtFromCookieValue(raw: string): number | null {
  let payload = raw;
  if (payload.startsWith("base64-")) {
    try {
      payload = decodeBase64Url(payload.slice("base64-".length));
    } catch {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(payload) as {
      expires_at?: unknown;
      access_token?: unknown;
    };
    if (typeof parsed.expires_at === "number") return parsed.expires_at;
    if (typeof parsed.access_token === "string") {
      return readJwtExp(parsed.access_token);
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Access-token expiry from the auth cookie, without getSession().user
 * (that path logs the insecure-session warning on the server).
 */
export function readSupabaseAccessTokenExpiresAt(
  cookies: { name: string; value: string }[] | { getAll(): { name: string; value: string }[] }
): number | null {
  const list = Array.isArray(cookies) ? cookies : cookies.getAll();
  const groups = new Map<string, { index: number; value: string }[]>();

  for (const cookie of list) {
    if (!isAuthTokenCookieName(cookie.name)) continue;
    const chunkMatch = cookie.name.match(/^(.*auth-token)(?:\.(\d+))?$/);
    if (!chunkMatch) continue;
    const base = chunkMatch[1];
    const index = chunkMatch[2] ? Number(chunkMatch[2]) : -1;
    const chunks = groups.get(base) ?? [];
    chunks.push({ index, value: cookie.value });
    groups.set(base, chunks);
  }

  for (const chunks of groups.values()) {
    const numbered = chunks.filter((chunk) => chunk.index >= 0);
    const selected = numbered.length > 0 ? numbered : chunks;
    selected.sort((a, b) => a.index - b.index);
    const expiresAt = parseExpiresAtFromCookieValue(
      selected.map((chunk) => chunk.value).join("")
    );
    if (expiresAt != null) return expiresAt;
  }

  return null;
}
