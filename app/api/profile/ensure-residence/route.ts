import { NextResponse } from "next/server";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { createClient } from "@/lib/supabase/server";
import { ensureResidenceCityPinFromLabel } from "@/lib/supabase/ensure-residence-city-pin";

/** Pin the signed-in user's residence city if it is not on their map yet. */
export async function POST() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("residence")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile?.residence?.trim()) {
      return NextResponse.json({ created: false, reason: "no_residence" });
    }

    const result = await ensureResidenceCityPinFromLabel(
      supabase,
      user.id,
      profile.residence,
      { notify: false }
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (result.created) {
      await revalidateProfileForPin(supabase, user.id);
    }

    return NextResponse.json({ created: result.created });
  } catch (error) {
    console.error("POST /api/profile/ensure-residence failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to pin residence" },
      { status: 500 }
    );
  }
}
