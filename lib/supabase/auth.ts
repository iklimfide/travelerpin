import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseAuthCookie } from "@/lib/supabase/session-cookie";

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

/**
 * Returns the signed-in user, or null for guests / broken sessions.
 * Never throws — corrupt cookies must not take down public pages.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const cookieStore = await cookies();
  if (!hasSupabaseAuthCookie(cookieStore)) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error && isRecoverableAuthError(error.message)) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore — cookie writes may fail in Server Components
      }
      return null;
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

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    return profile?.username ?? null;
  } catch {
    return null;
  }
});
