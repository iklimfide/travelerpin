import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parkInputSchema } from "@/lib/validations/park";
import { revalidateParkHubForPin } from "@/lib/cache/revalidate-park-hub";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { publishParkHubOnPin } from "@/lib/supabase/published-hubs";
import { notifyFollowersAfterParkPin } from "@/lib/supabase/notify-pin-followers";
import { ensureVisitedCountry } from "@/lib/supabase/ensure-visited-country";
import { resolvePinMediaForUser } from "@/lib/utils/pin-media-save";
import { geocodeCity } from "@/lib/utils/geocode";
import {
  formatVisitedParkSaveError,
  insertVisitedParkRow,
} from "@/lib/supabase/visited-park-update";

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
  const parsed = parkInputSchema.safeParse(body);

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

  let latitude = data.latitude ?? null;
  let longitude = data.longitude ?? null;

  if (latitude == null && longitude == null) {
    const coords = await geocodeCity(data.park_name, code, data.country_name);
    if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
    }
  }

  const mediaResult = await resolvePinMediaForUser(supabase, user.id, data);
  if (!mediaResult.ok) {
    return NextResponse.json({ error: mediaResult.error }, { status: 400 });
  }
  const media = mediaResult.media;

  const { data: park, error } = await insertVisitedParkRow(supabase, {
    user_id: user.id,
    park_name: data.park_name,
    park_type: data.park_type,
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
    visit_dates: data.visit_dates ?? [],
  });

  if (error) {
    return NextResponse.json(
      { error: formatVisitedParkSaveError(error.message) },
      { status: 500 }
    );
  }

  revalidateParkHubForPin(park.country_code, park.park_name);
  await revalidateProfileForPin(supabase, user.id);
  await publishParkHubOnPin(supabase, park);
  await notifyFollowersAfterParkPin(supabase, user.id, park);

  return NextResponse.json(park);
}
