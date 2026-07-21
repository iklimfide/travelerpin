import { after, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidateParkHubForPin } from "@/lib/cache/revalidate-park-hub";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { publishParkHubOnPin } from "@/lib/supabase/published-hubs";
import { notifyFollowersAfterParkPin } from "@/lib/supabase/notify-pin-followers";
import { deletePinNotifications } from "@/lib/supabase/notifications";
import { ensureVisitedCountry } from "@/lib/supabase/ensure-visited-country";
import { parkBatchDeleteSchema, parkBatchSchema } from "@/lib/validations/park";

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
  const parsed = parkBatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { country_code, country_name, parks } = parsed.data;
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
    .from("visited_parks")
    .select("park_name, park_type")
    .eq("user_id", user.id)
    .eq("country_code", code);

  const existingKeys = new Set(
    (existing ?? []).map((row) => `${row.park_type}:${row.park_name.toLowerCase()}`)
  );

  const toInsert = parks.filter(
    (park) => !existingKeys.has(`${park.park_type}:${park.park_name.toLowerCase()}`)
  );

  if (toInsert.length === 0) {
    return NextResponse.json(
      { error: "All selected parks are already on your map" },
      { status: 409 }
    );
  }

  const rows = toInsert.map((park) => ({
    user_id: user.id,
    park_name: park.park_name,
    park_type: park.park_type,
    country_code: code,
    country_name,
    latitude: park.latitude ?? null,
    longitude: park.longitude ?? null,
    note: null,
    media_type: null,
    media_url: null,
  }));

  const { data: inserted, error } = await supabase
    .from("visited_parks")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const insertedParks = inserted ?? [];
  if (insertedParks.length > 0) {
    after(async () => {
      for (const park of insertedParks) {
        revalidateParkHubForPin(park.country_code, park.park_name);
        await publishParkHubOnPin(supabase, park);
        await notifyFollowersAfterParkPin(supabase, user.id, park);
      }
      await revalidateProfileForPin(supabase, user.id);
    });
  }

  return NextResponse.json({
    added: insertedParks.length,
    skipped: parks.length - toInsert.length,
    parks: insertedParks,
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
  const parsed = parkBatchDeleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const ids = [...new Set(parsed.data.ids)];

  const { data: existing, error: loadError } = await supabase
    .from("visited_parks")
    .select("id, park_name, country_code")
    .eq("user_id", user.id)
    .in("id", ids);

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }

  const rows = existing ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No matching parks found" }, { status: 404 });
  }

  const deletableIds = rows.map((row) => row.id);

  const { error: deleteError } = await supabase
    .from("visited_parks")
    .delete()
    .eq("user_id", user.id)
    .in("id", deletableIds);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  after(() => revalidateProfileForPin(supabase, user.id));

  after(async () => {
    for (const row of rows) {
      await deletePinNotifications(supabase, user.id, "park", row.id);
      revalidateParkHubForPin(row.country_code, row.park_name);
    }
  });

  return NextResponse.json({
    deleted: deletableIds.length,
    ids: deletableIds,
  });
}
