import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { profileCacheTag } from "@/lib/cache/revalidate-profile";
import {
  requireAdminClient,
  requireKamikazeMasterApi,
} from "@/lib/kamikaze/auth";
import { KAMIKAZE_MASTER_USER_ID, isKamikazeMasterUser } from "@/lib/kamikaze/master";
import { normalizeUsernameInput } from "@/lib/utils/username";
import { usernameSchema } from "@/lib/validations/username";

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  residence: string | null;
  created_at: string;
  banned_at: string | null;
  ban_reason: string | null;
};

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const adminGate = requireAdminClient();
  if ("response" in adminGate) return adminGate.response;
  const { admin } = adminGate;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const rawOffset = Number(searchParams.get("offset") ?? 0);
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;
  const fetchLimit = PAGE_SIZE + 1;

  const safeQ = q.replace(/[%_,.()]/g, " ").trim();

  let query = admin
    .from("profiles")
    .select("id, username, display_name, avatar_url, residence, created_at, banned_at, ban_reason");

  if (safeQ) {
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
    query = query.or(orParts.join(","));
  }

  const { data: profileRows, error: profileError } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + fetchLimit - 1);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const fetched = (profileRows ?? []) as ProfileRow[];
  const hasMore = fetched.length > PAGE_SIZE;
  const profiles = hasMore ? fetched.slice(0, PAGE_SIZE) : fetched;
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
      residence: profile.residence,
      createdAt: profile.created_at,
      bannedAt: profile.banned_at,
      banReason: profile.ban_reason,
      email: emailById.get(profile.id) ?? null,
      isMaster: profile.id === KAMIKAZE_MASTER_USER_ID,
    })),
    hasMore,
    nextOffset: offset + profiles.length,
  });
}

type UserBody =
  | { action: "ban"; userId: string; reason?: string }
  | { action: "unban"; userId: string }
  | { action: "delete"; userId: string }
  | {
      action: "update";
      userId: string;
      username?: string;
      displayName?: string | null;
      email?: string | null;
    };

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

  if (body.action === "update") {
    const { data: existing, error: existingError } = await admin
      .from("profiles")
      .select("username, display_name")
      .eq("id", userId)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: existingError?.message ?? "Kullanıcı bulunamadı" },
        { status: 400 }
      );
    }

    const oldUsername = String(existing.username);
    const profileUpdates: Record<string, unknown> = {};

    if (body.username !== undefined) {
      const parsed = usernameSchema.safeParse(body.username);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Geçersiz kullanıcı adı" },
          { status: 400 }
        );
      }
      const nextUsername = parsed.data;
      if (nextUsername !== normalizeUsernameInput(oldUsername)) {
        const { data: taken } = await admin
          .from("profiles")
          .select("id")
          .eq("username", nextUsername)
          .neq("id", userId)
          .maybeSingle();
        if (taken) {
          return NextResponse.json(
            { error: "Bu kullanıcı adı alınmış" },
            { status: 400 }
          );
        }
        profileUpdates.username = nextUsername;
      }
    }

    if (body.displayName !== undefined) {
      const displayName = body.displayName?.trim() || null;
      if (displayName !== (existing.display_name ?? null)) {
        profileUpdates.display_name = displayName;
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await admin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", userId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    if (body.email !== undefined) {
      const nextEmail = body.email?.trim() || "";
      if (!nextEmail) {
        return NextResponse.json({ error: "E-posta boş olamaz" }, { status: 400 });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        return NextResponse.json({ error: "Geçersiz e-posta" }, { status: 400 });
      }
      const currentEmail = authUser.user?.email ?? "";
      if (nextEmail.toLowerCase() !== currentEmail.toLowerCase()) {
        const { error: emailError } = await admin.auth.admin.updateUserById(userId, {
          email: nextEmail,
          email_confirm: true,
        });
        if (emailError) {
          return NextResponse.json({ error: emailError.message }, { status: 400 });
        }
      }
    }

    if (profileUpdates.username) {
      revalidateTag(profileCacheTag(oldUsername), "max");
      revalidateTag(profileCacheTag(String(profileUpdates.username)), "max");
    } else if (Object.keys(profileUpdates).length > 0) {
      revalidateTag(profileCacheTag(oldUsername), "max");
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
