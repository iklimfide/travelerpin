import type { SupabaseClient } from "@supabase/supabase-js";
import type { EnrichedNotificationRow, NotificationRow, NotificationType } from "@/types/database";
import { profilePath, countryPath, cityPath, parkPath } from "@/lib/seo/site";
import { buildCitySlug } from "@/lib/utils/city-slug";
import { buildParkSlug } from "@/lib/utils/park-slug";
import { resolveCountryHubSlug } from "@/lib/data/country-hubs";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";

export type NotificationPayload = {
  actorUsername?: string;
  actorDisplayName?: string;
  actorAvatarUrl?: string | null;
  placeName?: string;
  countryName?: string;
  countryCode?: string;
  href?: string;
  parkType?: string;
  /** System / brand announcements */
  title?: string;
  message?: string;
};

/** Shown as the sender for YP broadcast notifications. */
export const SYSTEM_NOTIFICATION_SENDER = {
  displayName: "TravelerPin.com",
  avatarUrl: "/favicon-32x32.png",
} as const;

export async function notifyProfileFollowers(
  supabase: SupabaseClient,
  actorId: string,
  input: {
    type: NotificationType;
    entityType: string;
    entityId: string;
    payload: NotificationPayload;
  }
): Promise<void> {
  const { error } = await supabase.rpc("notify_profile_followers", {
    p_actor_id: actorId,
    p_type: input.type,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_payload: input.payload,
  });

  if (error) {
    console.error("notify_profile_followers failed:", error.message);
  }
}

export async function loadUnreadNotificationCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("unread notification count failed:", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function loadNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 40
): Promise<EnrichedNotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, recipient_id, actor_id, type, entity_type, entity_id, payload, read_at, created_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("load notifications failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as NotificationRow[];
  const actorIds = [
    ...new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id))),
  ];

  const profileMap = new Map<
    string,
    { username: string; display_name: string | null; avatar_url: string | null }
  >();

  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", actorIds);

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, profile);
    }
  }

  return rows.map((row) => ({
    ...row,
    actorProfile: row.actor_id ? profileMap.get(row.actor_id) ?? null : null,
  }));
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", userId)
    .is("read_at", null);

  return !error;
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);

  return !error;
}

/** Remove follower pin notifications when the actor unpins a place. */
export async function deletePinNotifications(
  supabase: SupabaseClient,
  actorId: string,
  entityType: "country" | "city" | "park",
  entityId: string
): Promise<void> {
  const { error } = await supabase.rpc("delete_pin_notifications", {
    p_actor_id: actorId,
    p_entity_type: entityType,
    p_entity_id: entityId,
  });

  if (error) {
    console.error("delete_pin_notifications failed:", error.message);
  }
}

export function buildCountryPinHref(countryCode: string, countryName: string): string | null {
  const slug = resolveCountryHubSlug(countryCode, countryName);
  return slug ? countryPath(slug) : null;
}

export function buildCityPinHref(cityName: string): string {
  return cityPath(buildCitySlug(cityName));
}

export function buildParkPinHref(parkName: string): string {
  return parkPath(buildParkSlug(parkName));
}

export async function notifyFollowersOfCountryPin(
  supabase: SupabaseClient,
  actorId: string,
  actor: { username: string; display_name: string | null; avatar_url?: string | null },
  country: { id: string; country_code: string; country_name: string }
): Promise<void> {
  await notifyProfileFollowers(supabase, actorId, {
    type: "pin_country",
    entityType: "country",
    entityId: country.id,
    payload: {
      actorUsername: actor.username,
      actorDisplayName: resolveProfileDisplayName(actor.display_name, actor.username),
      actorAvatarUrl: actor.avatar_url ?? null,
      placeName: country.country_name,
      countryName: country.country_name,
      countryCode: country.country_code,
      href: buildCountryPinHref(country.country_code, country.country_name) ?? undefined,
    },
  });
}

export async function notifyFollowersOfCityPin(
  supabase: SupabaseClient,
  actorId: string,
  actor: { username: string; display_name: string | null; avatar_url?: string | null },
  city: { id: string; city_name: string; country_code: string; country_name: string }
): Promise<void> {
  await notifyProfileFollowers(supabase, actorId, {
    type: "pin_city",
    entityType: "city",
    entityId: city.id,
    payload: {
      actorUsername: actor.username,
      actorDisplayName: resolveProfileDisplayName(actor.display_name, actor.username),
      actorAvatarUrl: actor.avatar_url ?? null,
      placeName: city.city_name,
      countryName: city.country_name,
      countryCode: city.country_code,
      href: buildCityPinHref(city.city_name),
    },
  });
}

export async function notifyFollowersOfParkPin(
  supabase: SupabaseClient,
  actorId: string,
  actor: { username: string; display_name: string | null; avatar_url?: string | null },
  park: {
    id: string;
    park_name: string;
    park_type: string;
    country_code: string;
    country_name: string;
  }
): Promise<void> {
  await notifyProfileFollowers(supabase, actorId, {
    type: "pin_park",
    entityType: "park",
    entityId: park.id,
    payload: {
      actorUsername: actor.username,
      actorDisplayName: resolveProfileDisplayName(actor.display_name, actor.username),
      actorAvatarUrl: actor.avatar_url ?? null,
      placeName: park.park_name,
      countryName: park.country_name,
      countryCode: park.country_code,
      parkType: park.park_type,
      href: buildParkPinHref(park.park_name),
    },
  });
}

export function notificationActorProfileHref(notification: NotificationRow): string | null {
  const payload = notification.payload as NotificationPayload;
  if (payload.actorUsername) {
    return profilePath(payload.actorUsername);
  }
  if (notification.entity_type === "profile" && notification.entity_id) {
    return profilePath(notification.entity_id);
  }
  return null;
}

export function notificationTargetHref(notification: NotificationRow): string | null {
  const payload = notification.payload as NotificationPayload;

  if (notification.type === "system") {
    if (typeof payload.href === "string" && payload.href.startsWith("/")) {
      return payload.href;
    }
    return null;
  }

  if (notification.type === "follow") {
    if (payload.actorUsername) {
      return profilePath(payload.actorUsername);
    }
  }
  if (typeof payload.href === "string" && payload.href.startsWith("/")) {
    return payload.href;
  }
  if (notification.entity_type === "profile" && notification.entity_id) {
    return profilePath(notification.entity_id);
  }
  return notificationActorProfileHref(notification);
}
