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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user && error && isRecoverableAuthError(error.message)) {
    await supabase.auth.signOut();
  }

  return supabaseResponse;
}
