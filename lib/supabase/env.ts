function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

function isSupabaseApiUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.endsWith(".supabase.co") ||
      host.endsWith(".supabase.in") ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

/** Recover https://<ref>.supabase.co from the public anon JWT when the URL env is wrong. */
function supabaseUrlFromAnonKey(key: string): string | null {
  try {
    const payloadPart = key.split(".")[1];
    if (!payloadPart) return null;
    const payload = JSON.parse(decodeBase64Url(payloadPart)) as { ref?: unknown };
    if (typeof payload.ref === "string" && /^[a-z0-9]{10,40}$/.test(payload.ref)) {
      return `https://${payload.ref}.supabase.co`;
    }
  } catch {
    return null;
  }
  return null;
}

export function getSupabaseAnonKey(): string {
  return trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseUrl(): string {
  const configured = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (isSupabaseApiUrl(configured)) {
    return configured.replace(/\/$/, "");
  }

  const fromKey = supabaseUrlFromAnonKey(getSupabaseAnonKey());
  if (fromKey) return fromKey;

  return configured.replace(/\/$/, "");
}

export function getSupabasePublicEnv(): { url: string; key: string } | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key || !isSupabaseApiUrl(url)) return null;
  return { url, key };
}
