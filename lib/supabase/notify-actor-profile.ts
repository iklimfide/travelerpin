import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadActorProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<{ username: string; display_name: string | null; avatar_url: string | null } | null> {
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  return data ?? null;
}
