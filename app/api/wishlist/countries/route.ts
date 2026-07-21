import { after, NextResponse } from "next/server";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { createClient } from "@/lib/supabase/server";
import { countrySchema } from "@/lib/validations/country";

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
  const parsed = countrySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const code = data.country_code.toUpperCase();

  const { data: country, error } = await supabase
    .from("wishlist_countries")
    .insert({
      user_id: user.id,
      country_code: code,
      country_name: data.country_name,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Country already on your wishlist" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  after(() => revalidateProfileForPin(supabase, user.id));

  return NextResponse.json(country);
}
