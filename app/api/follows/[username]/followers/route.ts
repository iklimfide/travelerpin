import { NextResponse } from "next/server";
import { isDemoProfileUsername } from "@/lib/data/jennifer-demo-page";
import {
  getProfileIdByUsername,
  loadProfileFollowers,
} from "@/lib/supabase/profile-follows";
import { createClient } from "@/lib/supabase/server";

type RouteProps = {
  params: Promise<{ username: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { username: rawUsername } = await params;
  const username = rawUsername.trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  if (isDemoProfileUsername(username)) {
    return NextResponse.json({ username, followers: [], demo: true });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const profileId = await getProfileIdByUsername(supabase, username);
  if (!profileId) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const followers = await loadProfileFollowers(supabase, profileId);

  return NextResponse.json({ username, followers });
}
