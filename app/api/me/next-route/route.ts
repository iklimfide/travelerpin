import { after, NextResponse } from "next/server";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { parseNextRoutePayload, serializeNextRoutePayload } from "@/lib/utils/next-route";
import { nextRouteUpdateSchema } from "@/lib/validations/next-route";
import { createClient } from "@/lib/supabase/server";
import { safeGetUser } from "@/lib/supabase/safe-server";

export async function GET() {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }

    const user = await safeGetUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("next_route")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      if (error.message.includes("next_route")) {
        return NextResponse.json({ stops: [] });
      }
      console.error("next-route GET failed:", error.message);
      return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    }

    return NextResponse.json(parseNextRoutePayload(data?.next_route));
  } catch (error) {
    console.error("next-route GET failed:", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }

    const user = await safeGetUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = nextRouteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const payload = parseNextRoutePayload(parsed.data);
    const { error } = await supabase
      .from("profiles")
      .update({ next_route: serializeNextRoutePayload(payload) })
      .eq("id", user.id);

    if (error) {
      if (error.message.includes("next_route")) {
        return NextResponse.json(
          { error: "Next Route is not available yet. Run the latest database migration." },
          { status: 503 }
        );
      }
      console.error("next-route PATCH failed:", error.message);
      return NextResponse.json({ error: "Failed to save route" }, { status: 500 });
    }

    after(() => revalidateProfileForPin(supabase, user.id));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("next-route PATCH failed:", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
