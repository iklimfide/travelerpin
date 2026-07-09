import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Avoid bubbling transient Supabase/network failures into Next.js global error UI. */
export async function safeGetUser(supabase: SupabaseClient): Promise<User | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
