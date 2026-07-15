import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isKamikazeMasterUser } from "@/lib/kamikaze/master";

export async function requireKamikazeMaster(): Promise<User> {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login?next=/kamikaze");
  }
  if (!isKamikazeMasterUser(user)) {
    notFound();
  }
  return user;
}

/** API gate: 401 if unauthenticated, 404 if not master (do not advertise panel). */
export async function requireKamikazeMasterApi(): Promise<
  { user: User } | { response: NextResponse }
> {
  const user = await getAuthUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isKamikazeMasterUser(user)) {
    return { response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { user };
}

export function requireAdminClient() {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    return {
      response: NextResponse.json(
        { error: "Admin client unavailable" },
        { status: 503 }
      ),
    } as const;
  }
  return { admin } as const;
}
