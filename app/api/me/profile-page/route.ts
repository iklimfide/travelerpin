import { NextResponse } from "next/server";
import { getLoggedInUsername } from "@/lib/supabase/auth";
import { loadPublicProfilePage } from "@/lib/supabase/profile-page-data";

/** Signed-in user's own profile page payload (auth cookie required). */
export async function GET() {
  const username = await getLoggedInUsername();
  if (!username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await loadPublicProfilePage(username);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const own =
    data.currentUsername != null &&
    data.currentUsername.toLowerCase() === data.profile.username.toLowerCase() &&
    data.profile.username.toLowerCase() === username.toLowerCase();

  if (!own) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(data);
}
