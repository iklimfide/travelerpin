import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidateCityHubForPin } from "@/lib/cache/revalidate-city-hub";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { cityInputSchema } from "@/lib/validations/city";
import { ensureVisitedCountry } from "@/lib/supabase/ensure-visited-country";
import { deletePinNotifications } from "@/lib/supabase/notifications";
import { formatVisitedCitySaveError, updateVisitedCityRow } from "@/lib/supabase/visited-city-update";
import { resolvePinMediaForUser } from "@/lib/utils/pin-media-save";
import { geocodeCity } from "@/lib/utils/geocode";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
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

  const { data: existing } = await supabase
    .from("visited_cities")
    .select("city_name, country_code, latitude, longitude")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = cityInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const code = data.country_code.toUpperCase();

  const countryResult = await ensureVisitedCountry(
    supabase,
    user.id,
    code,
    data.country_name
  );

  if (!countryResult.ok) {
    return NextResponse.json({ error: countryResult.error }, { status: 500 });
  }

  const locationChanged =
    existing.city_name !== data.city_name ||
    existing.country_code.toUpperCase() !== code;

  let latitude = existing.latitude;
  let longitude = existing.longitude;

  if (locationChanged) {
    const coords = await geocodeCity(data.city_name, code, data.country_name);
    latitude = coords?.latitude ?? null;
    longitude = coords?.longitude ?? null;
  }

  const mediaResult = await resolvePinMediaForUser(supabase, user.id, data);
  if (!mediaResult.ok) {
    return NextResponse.json({ error: mediaResult.error }, { status: 400 });
  }
  const media = mediaResult.media;

  const { data: city, error } = await updateVisitedCityRow(supabase, id, user.id, {
    city_name: data.city_name,
    country_code: code,
    country_name: data.country_name,
    latitude,
    longitude,
    note: data.note ?? null,
    photo_url: media.photo_url,
    photo_urls: media.photo_urls,
    instagram_urls: media.instagram_urls,
    media_type: media.media_type,
    media_url: media.media_url,
    media_preview_url: media.media_preview_url,
    visit_dates: data.visit_dates ?? [],
  });

  if (error) {
    return NextResponse.json({ error: formatVisitedCitySaveError(error.message) }, { status: 500 });
  }

  revalidateCityHubForPin(city.country_code, city.city_name);
  if (
    existing.city_name !== city.city_name ||
    existing.country_code.toUpperCase() !== city.country_code.toUpperCase()
  ) {
    revalidateCityHubForPin(existing.country_code, existing.city_name);
  }
  await revalidateProfileForPin(supabase, user.id);

  return NextResponse.json(city);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
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

  const { data: existing } = await supabase
    .from("visited_cities")
    .select("city_name, country_code")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("visited_cities")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await deletePinNotifications(supabase, user.id, "city", id);
  revalidateCityHubForPin(existing.country_code, existing.city_name);
  await revalidateProfileForPin(supabase, user.id);

  return NextResponse.json({ success: true });
}
