import { NextResponse } from "next/server";
import { loadPublicProfilePage } from "@/lib/supabase/profile-page-data";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { username } = await context.params;
    const data = await loadPublicProfilePage(username);

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("profile page-data GET failed:", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
