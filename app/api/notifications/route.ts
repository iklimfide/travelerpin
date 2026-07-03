import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  loadNotifications,
  loadUnreadNotificationCount,
  markAllNotificationsRead,
} from "@/lib/supabase/notifications";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const countOnly = url.searchParams.get("countOnly") === "1";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 40), 80);

  const unreadCount = await loadUnreadNotificationCount(supabase, user.id);

  if (countOnly) {
    return NextResponse.json({ unreadCount });
  }

  const notifications = await loadNotifications(supabase, user.id, limit);

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST() {
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

  const ok = await markAllNotificationsRead(supabase, user.id);
  if (!ok) {
    return NextResponse.json({ error: "Failed to mark notifications read" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, unreadCount: 0 });
}
