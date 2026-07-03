import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deletePinNotifications } from "@/lib/supabase/notifications";

type RouteContext = { params: Promise<{ id: string }> };

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

  const { data: country } = await supabase
    .from("visited_countries")
    .select("country_code")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!country) {
    return NextResponse.json({ error: "Country not found" }, { status: 404 });
  }

  const { count: cityCount } = await supabase
    .from("visited_cities")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("country_code", country.country_code);

  if (cityCount && cityCount > 0) {
    return NextResponse.json(
      { error: "To delete a country, you first need to delete any cities or parks you've added to that country." },
      { status: 409 }
    );
  }

  const { count: parkCount } = await supabase
    .from("visited_parks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("country_code", country.country_code);

  if (parkCount && parkCount > 0) {
    return NextResponse.json(
      { error: "To delete a country, you first need to delete any cities or parks you've added to that country." },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("visited_countries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await deletePinNotifications(supabase, user.id, "country", id);

  return NextResponse.json({ success: true });
}
