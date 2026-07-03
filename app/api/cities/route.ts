import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidateCityHubForPin } from "@/lib/cache/revalidate-city-hub";
import { publishCityHubOnPin } from "@/lib/supabase/published-hubs";
import { notifyFollowersAfterCityPin } from "@/lib/supabase/notify-pin-followers";
import { cityInputSchema } from "@/lib/validations/city";
import { resolveCityMediaFields } from "@/lib/utils/city-media";
import { ensureVisitedCountry } from "@/lib/supabase/ensure-visited-country";
import { formatVisitedCitySaveError, insertVisitedCityRow } from "@/lib/supabase/visited-city-update";
import { geocodeCity } from "@/lib/utils/geocode";

export async function POST(request: Request) {
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

  const coords =
    data.latitude !== undefined && data.longitude !== undefined
      ? { latitude: data.latitude, longitude: data.longitude }
      : await geocodeCity(data.city_name, code, data.country_name);

  const media = await resolveCityMediaFields(data);

  const { data: city, error } = await insertVisitedCityRow(supabase, {
    user_id: user.id,
    city_name: data.city_name,
    country_code: code,
    country_name: data.country_name,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    note: data.note ?? null,
    photo_url: media.photo_url,
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
  await publishCityHubOnPin(supabase, city);
  await notifyFollowersAfterCityPin(supabase, user.id, city);

  return NextResponse.json(city);
}
