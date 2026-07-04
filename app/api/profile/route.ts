import { NextResponse } from "next/server";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { createClient } from "@/lib/supabase/server";
import { ensureResidenceCityPin } from "@/lib/supabase/ensure-residence-city-pin";
import { updateProfileSettings } from "@/lib/supabase/profile-settings";
import { profileSettingsSchema } from "@/lib/validations/profile";

/**
 * Profile settings update.
 * Residence is always a city pin: selecting a home city pins it like Add City,
 * and profiles.residence stores the city name for the profile pill.
 */
export async function PATCH(request: Request) {
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

  const body = await request.json();
  const parsed = profileSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  const data = parsed.data;

  if (data.wishlist_public !== undefined) updates.wishlist_public = data.wishlist_public;
  if (data.share_prompt_mode !== undefined) {
    updates.share_prompt_mode = data.share_prompt_mode;
  }
  if (data.display_name !== undefined) {
    updates.display_name = data.display_name || null;
  }
  if (data.bio !== undefined) updates.bio = data.bio || null;
  if (data.instagram_url !== undefined) updates.instagram_url = data.instagram_url || null;
  if (data.profession !== undefined) updates.profession = data.profession || null;
  if (data.marital_status !== undefined) updates.marital_status = data.marital_status || null;
  if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url;

  // Residence label on the profile. City pins are independent:
  // - Set/change home → pin the new city (old home city stays on the map).
  // - Clear home → remove the label only (city pin is never deleted here).
  if (data.residence_city) {
    const pinResult = await ensureResidenceCityPin(
      supabase,
      user.id,
      {
        city_name: data.residence_city.city_name,
        country_code: data.residence_city.country_code,
        country_name: data.residence_city.country_name,
        latitude: data.residence_city.latitude ?? null,
        longitude: data.residence_city.longitude ?? null,
      },
      { notify: true }
    );
    if (!pinResult.ok) {
      return NextResponse.json({ error: pinResult.error }, { status: 500 });
    }
    updates.residence = data.residence_city.city_name;
  } else if (data.residence !== undefined) {
    if (data.residence?.trim()) {
      return NextResponse.json(
        { error: "Choose your city from the list to set where you live." },
        { status: 400 }
      );
    }
    updates.residence = null;
  }

  const { profile, error } = await updateProfileSettings(supabase, user.id, updates);

  if (error || !profile) {
    return NextResponse.json({ error: error ?? "Failed to update profile" }, { status: 500 });
  }

  await revalidateProfileForPin(supabase, user.id);

  return NextResponse.json(profile);
}
