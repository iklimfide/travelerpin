import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { fetchWithTimeout } from "@/lib/supabase/fetch";

/** Cookie-less Supabase client for public cached/server reads. */
export function createPublicSupabaseClient(): SupabaseClient | null {
  const env = getSupabasePublicEnv();
  if (!env) return null;

  return createSupabaseClient(env.url, env.key, {
    global: { fetch: fetchWithTimeout },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
