import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidateCityHubForPin } from "@/lib/cache/revalidate-city-hub";
import { ensureVisitedCountry } from "@/lib/supabase/ensure-visited-country";
import { notifyFollowersAfterCityPin } from "@/lib/supabase/notify-pin-followers";
import { publishCityHubOnPin } from "@/lib/supabase/published-hubs";
import { formatVisitedCitySaveError, insertVisitedCityRow } from "@/lib/supabase/visited-city-update";
import { updateProfileSettings } from "@/lib/supabase/profile-settings";
import { profileSettingsSchema, type ProfileSettingsInput } from "@/lib/validations/profile";

type ResidenceCityInput = NonNullable<ProfileSettingsInput["residence_city"]>;

async function ensureResidenceCityPin(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  input: ResidenceCityInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = input.country_code.toUpperCase();

  const countryResult = await ensureVisitedCountry(
    supabase,
    userId,
    code,
    input.country_name
  );
  if (!countryResult.ok) return countryResult;

  const { data: existingCity } = await supabase
    .from("visited_cities")
    .select("id")
    .eq("user_id", userId)
    .eq("country_code", code)
    .ilike("city_name", input.city_name)
    .maybeSingle();

  if (existingCity) return { ok: true };

  const { data: city, error } = await insertVisitedCityRow(supabase, {
    user_id: userId,
    city_name: input.city_name,
    country_code: code,
    country_name: input.country_name,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    note: null,
    photo_url: null,
    instagram_urls: [],
    media_type: null,
    media_url: null,
    media_preview_url: null,
    visit_dates: [],
  });

  if (error) {
    return { ok: false, error: formatVisitedCitySaveError(error.message) };
  }

  revalidateCityHubForPin(city.country_code, city.city_name);
  await publishCityHubOnPin(supabase, city);
  await notifyFollowersAfterCityPin(supabase, userId, city);

  return { ok: true };
}

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
  if (data.residence !== undefined) updates.residence = data.residence || null;
  if (data.instagram_url !== undefined) updates.instagram_url = data.instagram_url || null;
  if (data.profession !== undefined) updates.profession = data.profession || null;
  if (data.marital_status !== undefined) updates.marital_status = data.marital_status || null;
  if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url;
  if (data.residence_city) updates.residence = data.residence_city.city_name;

  if (data.residence_city) {
    const pinResult = await ensureResidenceCityPin(supabase, user.id, data.residence_city);
    if (!pinResult.ok) {
      return NextResponse.json({ error: pinResult.error }, { status: 500 });
    }
  }

  const { profile, error } = await updateProfileSettings(supabase, user.id, updates);

  if (error || !profile) {
    return NextResponse.json({ error: error ?? "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json(profile);
}
