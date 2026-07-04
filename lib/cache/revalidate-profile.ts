import { revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Username-keyed tag used by getCachedPublicProfileBundle. */
export function profileCacheTag(username: string): string {
  return `profile:${username.trim().toLowerCase()}`;
}

/**
 * Bust the long-lived public profile pin/map cache after a pin or profile write.
 * Follow counts and notifications are not part of this cache.
 */
export async function revalidateProfileForPin(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (!data?.username) return;
  revalidateTag(profileCacheTag(data.username), "max");
}
