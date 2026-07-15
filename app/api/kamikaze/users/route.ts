import { NextResponse } from "next/server";
import {
  requireAdminClient,
  requireKamikazeMasterApi,
} from "@/lib/kamikaze/auth";
import { KAMIKAZE_MASTER_USER_ID, isKamikazeMasterUser } from "@/lib/kamikaze/master";

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  banned_at: string | null;
  ban_reason: string | null;
};

export async function GET(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const adminGate = requireAdminClient();
  if ("response" in adminGate) return adminGate.response;
  const { admin } = adminGate;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const safeQ = q.replace(/[%_,.()]/g, " ").trim();
  if (!safeQ) {
    return NextResponse.json({ users: [] });
  }

  const emailNeedle = safeQ.toLowerCase();
  const emailMatches: string[] = [];

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const users = data.users ?? [];
    if (users.length === 0) break;
    for (const user of users) {
      const email = user.email?.toLowerCase() ?? "";
      if (email.includes(emailNeedle)) {
        emailMatches.push(user.id);
      }
    }
    if (users.length < 200) break;
  }

  const orParts = [
    `username.ilike.%${safeQ}%`,
    `display_name.ilike.%${safeQ}%`,
  ];
  if (emailMatches.length > 0) {
    orParts.push(`id.in.(${emailMatches.join(",")})`);
  }

  const { data: profileRows, error: profileError } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url, created_at, banned_at, ban_reason")
    .or(orParts.join(","))
    .order("created_at", { ascending: false })
    .limit(50);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const profiles = (profileRows ?? []) as ProfileRow[];
  const ids = profiles.map((p) => p.id);

  const emailById = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data.user?.email) emailById.set(id, data.user.email);
    })
  );

  return NextResponse.json({
    users: profiles.map((profile) => ({
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      createdAt: profile.created_at,
      bannedAt: profile.banned_at,
      banReason: profile.ban_reason,
      email: emailById.get(profile.id) ?? null,
      isMaster: profile.id === KAMIKAZE_MASTER_USER_ID,
    })),
  });
}

type UserBody =
  | { action: "ban"; userId: string; reason?: string }
  | { action: "unban"; userId: string }
  | { action: "delete"; userId: string };

export async function POST(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const adminGate = requireAdminClient();
  if ("response" in adminGate) return adminGate.response;
  const { admin } = adminGate;

  let body: UserBody;
  try {
    body = (await request.json()) as UserBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = body.userId?.trim();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  if (userId === KAMIKAZE_MASTER_USER_ID || userId === gate.user.id) {
    return NextResponse.json(
      { error: "Cannot modify the master account" },
      { status: 400 }
    );
  }

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  if (authUser.user && isKamikazeMasterUser(authUser.user)) {
    return NextResponse.json(
      { error: "Cannot modify the master account" },
      { status: 400 }
    );
  }

  if (body.action === "ban") {
    const reason = body.reason?.trim() || null;
    const { error } = await admin
      .from("profiles")
      .update({
        banned_at: new Date().toISOString(),
        ban_reason: reason,
      })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Ban for a long duration via Auth (in addition to profile flag).
    try {
      await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });
    } catch {
      /* Auth ban is best-effort */
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "unban") {
    const { error } = await admin
      .from("profiles")
      .update({ banned_at: null, ban_reason: null })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    try {
      await admin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
    } catch {
      /* best-effort */
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete") {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
