import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseAuthCookie } from "@/lib/supabase/session-cookie";

export const getAuthUser = cache(async (): Promise<User | null> => {
  const cookieStore = await cookies();
  if (!hasSupabaseAuthCookie(cookieStore)) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  try {
    // Cookie session only — middleware refreshes tokens; avoid getUser()'s auth-server
    // round trip (4s fetch timeout) on every RSC/metadata render.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return null;

    // Ban check is best-effort: timeouts / missing columns must not drop valid sessions
    // (otherwise /kamikaze and chrome intermittently redirect to login).
    try {
      const { data: profile, error: banError } = await supabase
        .from("profiles")
        .select("banned_at")
        .eq("id", user.id)
        .maybeSingle();

      if (!banError && profile?.banned_at) {
        try {
          await supabase.auth.signOut();
        } catch {
          /* ignore */
        }
        return null;
      }
    } catch {
      /* fail open */
    }

    return user;
  } catch {
    return null;
  }
});

export const getLoggedInUsername = cache(async (): Promise<string | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  return profile?.username ?? null;
});
