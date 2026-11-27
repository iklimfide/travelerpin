import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { fetchWithTimeout } from "@/lib/supabase/fetch";

/** Service-role client for trusted server writes (bypasses RLS). */
export function createAdminSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    global: { fetch: fetchWithTimeout },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
