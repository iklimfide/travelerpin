import { NextResponse } from "next/server";
import {
  requireAdminClient,
  requireKamikazeMasterApi,
} from "@/lib/kamikaze/auth";
import {
  SYSTEM_NOTIFICATION_SENDER,
  type NotificationPayload,
} from "@/lib/supabase/notifications";

const PROFILE_PAGE = 500;
const INSERT_CHUNK = 250;
const MESSAGE_MAX = 500;
const TITLE_MAX = 120;

type BroadcastBody = {
  action: "broadcast";
  title?: string;
  message: string;
  href?: string | null;
};

type RecentBroadcast = {
  id: string;
  title: string | null;
  message: string;
  href: string | null;
  recipientCount: number;
  createdAt: string;
};

export async function GET() {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const adminGate = requireAdminClient();
  if ("response" in adminGate) return adminGate.response;
  const { admin } = adminGate;

  const { count, error: countError } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .is("banned_at", null);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 400 });
  }

  const { data: recent, error: recentError } = await admin
    .from("yp_system_broadcasts")
    .select("id, title, message, href, recipient_count, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (recentError) {
    // Table may be missing until migration 033 is applied.
    return NextResponse.json({
      activeRecipientCount: count ?? 0,
      recent: [] as RecentBroadcast[],
      warning: recentError.message,
    });
  }

  return NextResponse.json({
    activeRecipientCount: count ?? 0,
    recent: (recent ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      href: row.href,
      recipientCount: Number(row.recipient_count) || 0,
      createdAt: row.created_at,
    })) satisfies RecentBroadcast[],
  });
}

export async function POST(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const adminGate = requireAdminClient();
  if ("response" in adminGate) return adminGate.response;
  const { admin } = adminGate;

  let body: BroadcastBody;
  try {
    body = (await request.json()) as BroadcastBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "broadcast") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const message = body.message?.trim() ?? "";
  const title = body.title?.trim() || null;
  const hrefRaw = body.href?.trim() || null;

  if (!message) {
    return NextResponse.json({ error: "Mesaj gerekli" }, { status: 400 });
  }
  if (message.length > MESSAGE_MAX) {
    return NextResponse.json(
      { error: `Mesaj en fazla ${MESSAGE_MAX} karakter olabilir` },
      { status: 400 }
    );
  }
  if (title && title.length > TITLE_MAX) {
    return NextResponse.json(
      { error: `Başlık en fazla ${TITLE_MAX} karakter olabilir` },
      { status: 400 }
    );
  }

  let href: string | null = null;
  if (hrefRaw) {
    if (!hrefRaw.startsWith("/")) {
      return NextResponse.json(
        { error: "Link site içi olmalı (ör. /explore)" },
        { status: 400 }
      );
    }
    href = hrefRaw;
  }

  const payload: NotificationPayload = {
    actorDisplayName: SYSTEM_NOTIFICATION_SENDER.displayName,
    actorAvatarUrl: SYSTEM_NOTIFICATION_SENDER.avatarUrl,
    ...(title ? { title } : {}),
    message,
    ...(href ? { href } : {}),
  };

  const recipientIds: string[] = [];
  for (let from = 0; ; from += PROFILE_PAGE) {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .is("banned_at", null)
      .order("created_at", { ascending: true })
      .range(from, from + PROFILE_PAGE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const page = data ?? [];
    for (const row of page) {
      if (row.id) recipientIds.push(String(row.id));
    }
    if (page.length < PROFILE_PAGE) break;
  }

  if (recipientIds.length === 0) {
    return NextResponse.json({ error: "Aktif üye bulunamadı" }, { status: 400 });
  }

  let inserted = 0;
  for (let i = 0; i < recipientIds.length; i += INSERT_CHUNK) {
    const chunk = recipientIds.slice(i, i + INSERT_CHUNK);
    const rows = chunk.map((recipientId) => ({
      recipient_id: recipientId,
      actor_id: null,
      type: "system" as const,
      entity_type: "broadcast",
      entity_id: null,
      payload,
    }));

    const { error } = await admin.from("notifications").insert(rows);
    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          inserted,
          failedAt: i,
        },
        { status: 400 }
      );
    }
    inserted += chunk.length;
  }

  const { error: logError } = await admin.from("yp_system_broadcasts").insert({
    title,
    message,
    href,
    recipient_count: inserted,
    created_by: gate.user.id,
  });

  if (logError) {
    // Delivery succeeded; audit log is best-effort until migration is applied.
    return NextResponse.json({
      ok: true,
      recipientCount: inserted,
      warning: logError.message,
    });
  }

  return NextResponse.json({ ok: true, recipientCount: inserted });
}
