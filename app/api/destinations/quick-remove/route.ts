import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deletePinNotifications } from "@/lib/supabase/notifications";
import { quickDestinationSchema } from "@/lib/validations/destination";

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
  const parsed = quickDestinationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const code = data.country_code.toUpperCase();

  if (data.kind === "country") {
    const { count: cityCount } = await supabase
      .from("visited_cities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("country_code", code);

    if ((cityCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "Remove cities in this country first" },
        { status: 409 }
      );
    }

    const { data: visitedCountry } = await supabase
      .from("visited_countries")
      .select("id")
      .eq("user_id", user.id)
      .eq("country_code", code)
      .maybeSingle();

    if (!visitedCountry) {
      return NextResponse.json({ removed: false, notFound: true });
    }

    const { error: countryError } = await supabase
      .from("visited_countries")
      .delete()
      .eq("id", visitedCountry.id)
      .eq("user_id", user.id);

    if (countryError) {
      return NextResponse.json({ error: countryError.message }, { status: 500 });
    }

    await deletePinNotifications(supabase, user.id, "country", visitedCountry.id);

    return NextResponse.json({
      removed: true,
      countryRemoved: true,
      countryCode: code,
    });
  }

  const { data: existingCity } = await supabase
    .from("visited_cities")
    .select("id")
    .eq("user_id", user.id)
    .eq("country_code", code)
    .ilike("city_name", data.city_name)
    .maybeSingle();

  if (!existingCity) {
    return NextResponse.json({ removed: false, notFound: true });
  }

  const { error: cityError } = await supabase
    .from("visited_cities")
    .delete()
    .eq("id", existingCity.id)
    .eq("user_id", user.id);

  if (cityError) {
    return NextResponse.json({ error: cityError.message }, { status: 500 });
  }

  await deletePinNotifications(supabase, user.id, "city", existingCity.id);

  const { count: remainingCities } = await supabase
    .from("visited_cities")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("country_code", code);

  let countryRemoved = false;
  if ((remainingCities ?? 0) === 0) {
    const { data: countryRow } = await supabase
      .from("visited_countries")
      .select("id")
      .eq("user_id", user.id)
      .eq("country_code", code)
      .maybeSingle();

    if (countryRow) {
      const { error: countryError } = await supabase
        .from("visited_countries")
        .delete()
        .eq("id", countryRow.id)
        .eq("user_id", user.id);

      if (countryError) {
        return NextResponse.json({ error: countryError.message }, { status: 500 });
      }

      await deletePinNotifications(supabase, user.id, "country", countryRow.id);
      countryRemoved = true;
    }
  }

  return NextResponse.json({
    removed: true,
    countryRemoved,
    countryCode: code,
  });
}
