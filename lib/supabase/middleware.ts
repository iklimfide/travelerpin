import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { fetchWithTimeout } from "@/lib/supabase/fetch";
import { hasSupabaseAuthCookie } from "@/lib/supabase/session-cookie";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function isRecoverableAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("refresh token") ||
    lower.includes("invalid jwt") ||
    lower.includes("session") ||
    lower.includes("token is expired")
  );
}

/** Skip Supabase round-trip while the access token is still comfortably valid. */
const SESSION_REFRESH_LEAD_SECONDS = 15 * 60;

/**
 * Refresh the auth session when needed.
 * Pass `baseResponse` from next-intl (or other) middleware so redirects/rewrites
 * and their cookies are preserved.
 */
export async function updateSession(
  request: NextRequest,
  baseResponse?: NextResponse
) {
  const env = getSupabaseEnv();
  if (!env) {
    return baseResponse ?? NextResponse.next({ request });
  }

  // Anonymous / bot traffic has nothing to refresh — skip the Supabase round-trip.
  if (!hasSupabaseAuthCookie(request.cookies)) {
    return baseResponse ?? NextResponse.next({ request });
  }

  let supabaseResponse = baseResponse ?? NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        if (!baseResponse) {
          supabaseResponse = NextResponse.next({ request });
        }
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return supabaseResponse;
    }

    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = expiresAt != null ? expiresAt - now : 0;

    // Cookie can last weeks; only hit Supabase when the access token needs refresh.
    if (secondsLeft > SESSION_REFRESH_LEAD_SECONDS) {
      return supabaseResponse;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!user && error && isRecoverableAuthError(error.message)) {
      await supabase.auth.signOut();
    }
  } catch {
    // Supabase slow/unreachable — don't block the request.
  }

  return supabaseResponse;
}
