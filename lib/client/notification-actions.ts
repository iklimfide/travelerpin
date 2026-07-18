import type { EnrichedNotificationRow } from "@/types/database";

type NotificationsResult =
  | { ok: true; notifications: EnrichedNotificationRow[]; unreadCount: number }
  | { ok: false; error: string };

let notificationsCache: Promise<NotificationsResult> | null = null;
let notificationsCachedAt = 0;

/** Cached list is reused briefly for instant opens; fresh data is fetched on expiry or force. */
const NOTIFICATIONS_CACHE_TTL_MS = 60_000;

export function fetchNotifications(
  limit = 40,
  options?: { force?: boolean }
): Promise<NotificationsResult> {
  const fresh = Date.now() - notificationsCachedAt < NOTIFICATIONS_CACHE_TTL_MS;
  if (notificationsCache && fresh && !options?.force) {
    return notificationsCache;
  }

  notificationsCachedAt = Date.now();
  const request = fetch(`/api/notifications?limit=${limit}`)
    .then(async (res): Promise<NotificationsResult> => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: (data.error as string) ?? "Failed to load notifications" };
      }
      return {
        ok: true,
        notifications: (data.notifications as EnrichedNotificationRow[]) ?? [],
        unreadCount: (data.unreadCount as number) ?? 0,
      };
    })
    .catch((): NotificationsResult => ({ ok: false, error: "Failed to load notifications" }))
    .then((result) => {
      // Do not keep failures cached; the next call should retry.
      if (!result.ok && notificationsCache === request) {
        notificationsCache = null;
      }
      return result;
    });

  notificationsCache = request;
  return request;
}

export function clearNotificationsCache() {
  notificationsCache = null;
  notificationsCachedAt = 0;
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await fetch("/api/notifications?countOnly=1");
  if (!res.ok) return 0;
  const data = await res.json().catch(() => ({}));
  return (data.unreadCount as number) ?? 0;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const res = await fetch("/api/notifications", { method: "POST" });
  if (res.ok) clearNotificationsCache();
  return res.ok;
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
  });
  if (res.ok) clearNotificationsCache();
  return res.ok;
}
