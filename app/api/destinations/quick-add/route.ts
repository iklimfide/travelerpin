import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureVisitedCountry } from "@/lib/supabase/ensure-visited-country";
import { publishCityHubOnPin } from "@/lib/supabase/published-hubs";
import {
  notifyFollowersAfterCityPin,
  notifyFollowersAfterCountryPin,
} from "@/lib/supabase/notify-pin-followers";
import { revalidateCityHubForPin } from "@/lib/cache/revalidate-city-hub";
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
    const { data: visitedCountry } = await supabase
      .from("visited_countries")
      .select("id")
      .eq("user_id", user.id)
      .eq("country_code", code)
      .maybeSingle();

    if (visitedCountry) {
      return NextResponse.json({ added: false, alreadyHad: true });
    }

    const { data: country, error: countryError } = await supabase
      .from("visited_countries")
      .insert({
        user_id: user.id,
        country_code: code,
        country_name: data.country_name,
      })
      .select()
      .single();

    if (countryError) {
      if (countryError.code === "23505") {
        return NextResponse.json({ added: false, alreadyHad: true });
      }
      return NextResponse.json({ error: countryError.message }, { status: 500 });
    }

    await supabase
      .from("wishlist_countries")
      .delete()
      .eq("user_id", user.id)
      .eq("country_code", code);

    await notifyFollowersAfterCountryPin(supabase, user.id, country);

    return NextResponse.json({ country, added: true, alreadyHad: false });
  }

  const { data: existingCity } = await supabase
    .from("visited_cities")
    .select("id")
    .eq("user_id", user.id)
    .eq("country_code", code)
    .ilike("city_name", data.city_name)
    .maybeSingle();

  if (existingCity) {
    return NextResponse.json({ city: existingCity, added: false, alreadyHad: true });
  }

  const countryResult = await ensureVisitedCountry(
    supabase,
    user.id,
    code,
    data.country_name
  );

  if (!countryResult.ok) {
    return NextResponse.json({ error: countryResult.error }, { status: 500 });
  }

  const { data: city, error: cityError } = await supabase
    .from("visited_cities")
    .insert({
      user_id: user.id,
      city_name: data.city_name,
      country_code: code,
      country_name: data.country_name,
      latitude: data.latitude,
      longitude: data.longitude,
      note: null,
      media_type: null,
      media_url: null,
      visit_dates: [],
    })
    .select()
    .single();

  if (cityError) {
    return NextResponse.json({ error: cityError.message }, { status: 500 });
  }

  revalidateCityHubForPin(city.country_code, city.city_name);
  await publishCityHubOnPin(supabase, city);
  await notifyFollowersAfterCityPin(supabase, user.id, city);

  return NextResponse.json({ city, added: true, alreadyHad: false });
}
