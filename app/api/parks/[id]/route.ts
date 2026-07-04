import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidateParkHubForPin } from "@/lib/cache/revalidate-park-hub";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { ensureVisitedCountry } from "@/lib/supabase/ensure-visited-country";
import { deletePinNotifications } from "@/lib/supabase/notifications";
import { resolveCityMediaFields } from "@/lib/utils/city-media";
import { parkInputSchema } from "@/lib/validations/park";
import {
  formatVisitedParkSaveError,
  updateVisitedParkRow,
} from "@/lib/supabase/visited-park-update";

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
    .from("visited_parks")
    .select("park_name, park_type, country_code, latitude, longitude")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
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

  let latitude = existing.latitude;
  let longitude = existing.longitude;

  const locationChanged =
    existing.park_name !== data.park_name ||
    existing.park_type !== data.park_type ||
    existing.country_code.toUpperCase() !== code;

  if (data.latitude !== undefined && data.longitude !== undefined) {
    latitude = data.latitude;
    longitude = data.longitude;
  } else if (locationChanged) {
    latitude = null;
    longitude = null;
  }

  const media = await resolveCityMediaFields(data);

  const { data: park, error } = await updateVisitedParkRow(supabase, id, user.id, {
    park_name: data.park_name,
    park_type: data.park_type,
    country_code: code,
    country_name: data.country_name,
    latitude,
    longitude,
    note: data.note ?? null,
    photo_url: media.photo_url,
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
  if (
    existing.park_name !== park.park_name ||
    existing.country_code.toUpperCase() !== park.country_code.toUpperCase()
  ) {
    revalidateParkHubForPin(existing.country_code, existing.park_name);
  }
  await revalidateProfileForPin(supabase, user.id);

  return NextResponse.json(park);
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
    .from("visited_parks")
    .select("park_name, country_code")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("visited_parks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await deletePinNotifications(supabase, user.id, "park", id);
  revalidateParkHubForPin(existing.country_code, existing.park_name);
  await revalidateProfileForPin(supabase, user.id);

  return NextResponse.json({ success: true });
}
