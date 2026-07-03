import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateParkHubForPin } from "@/lib/cache/revalidate-park-hub";
import { createClient } from "@/lib/supabase/server";
import { deletePinNotifications } from "@/lib/supabase/notifications";
import { PARK_TYPES } from "@/types/database";
import { formatCityDisplayName } from "@/lib/utils/city-name";

const removeSchema = z.object({
  park_name: z.string().min(1).max(100).transform(formatCityDisplayName),
  park_type: z.enum(PARK_TYPES),
  country_code: z.string().length(2),
});

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
  const parsed = removeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const code = data.country_code.toUpperCase();

  const { data: park } = await supabase
    .from("visited_parks")
    .select("id")
    .eq("user_id", user.id)
    .eq("country_code", code)
    .eq("park_type", data.park_type)
    .ilike("park_name", data.park_name)
    .maybeSingle();

  if (!park) {
    return NextResponse.json({ removed: false, countryRemoved: false });
  }

  const { error: deleteError } = await supabase
    .from("visited_parks")
    .delete()
    .eq("id", park.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await deletePinNotifications(supabase, user.id, "park", park.id);
  revalidateParkHubForPin(code, data.park_name);

  const [{ count: cityCount }, { count: parkCount }, { data: countryRow }] =
    await Promise.all([
      supabase
        .from("visited_cities")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("country_code", code),
      supabase
        .from("visited_parks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("country_code", code),
      supabase
        .from("visited_countries")
        .select("id")
        .eq("user_id", user.id)
        .eq("country_code", code)
        .maybeSingle(),
    ]);

  let countryRemoved = false;
  if (countryRow && (cityCount ?? 0) === 0 && (parkCount ?? 0) === 0) {
    const { error: countryError } = await supabase
      .from("visited_countries")
      .delete()
      .eq("id", countryRow.id);

    if (countryError) {
      return NextResponse.json({ error: countryError.message }, { status: 500 });
    }
    await deletePinNotifications(supabase, user.id, "country", countryRow.id);
    countryRemoved = true;
  }

  return NextResponse.json({ removed: true, countryRemoved });
}
