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
    lower.includes("token is expired") ||
    lower.includes("auth session missing") ||
    lower.includes("invalid claim") ||
    lower.includes("user not found")
  );
}

/** Drop every Supabase auth cookie so the request continues as a guest. */
function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.includes("auth-token") && !cookie.name.startsWith("sb-")) continue;
    request.cookies.delete(cookie.name);
    response.cookies.set(cookie.name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  }
}

/** Skip Supabase round-trip while the access token is still comfortably valid. */
const SESSION_REFRESH_LEAD_SECONDS = 15 * 60;

export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.next({ request });
  }

  // Anonymous / bot traffic has nothing to refresh — skip the Supabase round-trip.
  if (!hasSupabaseAuthCookie(request.cookies)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

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
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError && isRecoverableAuthError(sessionError.message)) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      clearSupabaseAuthCookies(request, supabaseResponse);
      return supabaseResponse;
    }

    if (!session) {
      // Stale auth cookie with no usable session — continue as guest.
      clearSupabaseAuthCookies(request, supabaseResponse);
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
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      clearSupabaseAuthCookies(request, supabaseResponse);
    }
  } catch {
    // Supabase slow/unreachable or cookie chaos — clear auth and don't block the request.
    clearSupabaseAuthCookies(request, supabaseResponse);
  }

  return supabaseResponse;
}
