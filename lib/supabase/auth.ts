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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
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
