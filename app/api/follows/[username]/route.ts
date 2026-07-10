import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  followProfile,
  getProfileIdByUsername,
  loadProfileFollowState,
  unfollowProfile,
} from "@/lib/supabase/profile-follows";
import { isDemoProfileUsername } from "@/lib/data/demo-profile-username";

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
    return NextResponse.json({
      username,
      canFollow: false,
      isFollowing: false,
      followerCount: 0,
      followingCount: 0,
      demo: true,
    });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const profileId = await getProfileIdByUsername(supabase, username);
  if (!profileId) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const state = await loadProfileFollowState(supabase, profileId, user?.id ?? null);

  return NextResponse.json({
    username,
    canFollow: Boolean(user) && user!.id !== profileId && !isDemoProfileUsername(username),
    ...state,
  });
}

export async function POST(_request: Request, { params }: RouteProps) {
  const { username: rawUsername } = await params;
  const username = rawUsername.trim().toLowerCase();
  if (!username || isDemoProfileUsername(username)) {
    return NextResponse.json({ error: "Cannot follow this profile" }, { status: 400 });
  }

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

  const profileId = await getProfileIdByUsername(supabase, username);
  if (!profileId) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profileId === user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const result = await followProfile(supabase, profileId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const state = await loadProfileFollowState(supabase, profileId, user.id);

  return NextResponse.json({ following: true, created: result.created, ...state });
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  const { username: rawUsername } = await params;
  const username = rawUsername.trim().toLowerCase();
  if (!username) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

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

  const profileId = await getProfileIdByUsername(supabase, username);
  if (!profileId) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const result = await unfollowProfile(supabase, profileId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const state = await loadProfileFollowState(supabase, profileId, user.id);

  return NextResponse.json({ following: false, ...state });
}
