import { after, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureVisitedCountry } from "@/lib/supabase/ensure-visited-country";
import { publishCityHubOnPin } from "@/lib/supabase/published-hubs";
import { notifyFollowersAfterCityPin } from "@/lib/supabase/notify-pin-followers";
import { deletePinNotifications } from "@/lib/supabase/notifications";
import { revalidateCityHubForPin } from "@/lib/cache/revalidate-city-hub";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { cityBatchDeleteSchema, cityBatchSchema } from "@/lib/validations/city-batch";

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
  const parsed = cityBatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { country_code, country_name, cities } = parsed.data;
  const code = country_code.toUpperCase();

  const countryResult = await ensureVisitedCountry(
    supabase,
    user.id,
    code,
    country_name
  );

  if (!countryResult.ok) {
    return NextResponse.json({ error: countryResult.error }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from("visited_cities")
    .select("city_name")
    .eq("user_id", user.id)
    .eq("country_code", code);

  const existingNames = new Set(
    (existing ?? []).map((row) => row.city_name.toLowerCase())
  );

  const toInsert = cities.filter(
    (city) => !existingNames.has(city.city_name.toLowerCase())
  );

  if (toInsert.length === 0) {
    return NextResponse.json(
      { error: "All selected cities are already on your map" },
      { status: 409 }
    );
  }

  const rows = toInsert.map((city) => ({
    user_id: user.id,
    city_name: city.city_name,
    country_code: code,
    country_name,
    latitude: city.latitude ?? null,
    longitude: city.longitude ?? null,
    note: null,
    media_type: null,
    media_url: null,
    visit_dates: [],
  }));

  const { data: inserted, error } = await supabase
    .from("visited_cities")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const insertedCities = inserted ?? [];
  if (insertedCities.length > 0) {
    after(() => revalidateProfileForPin(supabase, user.id));

    after(async () => {
      for (const city of insertedCities) {
        revalidateCityHubForPin(city.country_code, city.city_name);
        await publishCityHubOnPin(supabase, city);
        await notifyFollowersAfterCityPin(supabase, user.id, city);
      }
    });
  }

  return NextResponse.json({
    added: insertedCities.length,
    skipped: cities.length - toInsert.length,
    cities: insertedCities,
  });
}

export async function DELETE(request: Request) {
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

  const body = await request.json().catch(() => null);
  const parsed = cityBatchDeleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const ids = [...new Set(parsed.data.ids)];

  const { data: existing, error: loadError } = await supabase
    .from("visited_cities")
    .select("id, city_name, country_code")
    .eq("user_id", user.id)
    .in("id", ids);

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }

  const rows = existing ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No matching cities found" }, { status: 404 });
  }

  const deletableIds = rows.map((row) => row.id);

  const { error: deleteError } = await supabase
    .from("visited_cities")
    .delete()
    .eq("user_id", user.id)
    .in("id", deletableIds);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await revalidateProfileForPin(supabase, user.id);

  after(async () => {
    for (const row of rows) {
      await deletePinNotifications(supabase, user.id, "city", row.id);
      revalidateCityHubForPin(row.country_code, row.city_name);
    }
  });

  return NextResponse.json({
    deleted: deletableIds.length,
    ids: deletableIds,
  });
}
