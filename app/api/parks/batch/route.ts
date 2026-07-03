import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidateParkHubForPin } from "@/lib/cache/revalidate-park-hub";
import { publishParkHubOnPin } from "@/lib/supabase/published-hubs";
import { ensureVisitedCountry } from "@/lib/supabase/ensure-visited-country";
import { parkBatchSchema } from "@/lib/validations/park";

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

  for (const park of inserted ?? []) {
    revalidateParkHubForPin(park.country_code, park.park_name);
    await publishParkHubOnPin(supabase, park);
  }

  return NextResponse.json({
    added: inserted?.length ?? 0,
    skipped: parks.length - toInsert.length,
    parks: inserted,
  });
}
