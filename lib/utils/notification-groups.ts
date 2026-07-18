import type { EnrichedNotificationRow, NotificationType } from "@/types/database";
import {
  notificationTargetHref,
  type NotificationPayload,
} from "@/lib/supabase/notifications";

const PIN_NOTIFICATION_TYPES = new Set<NotificationType>([
  "pin_country",
  "pin_city",
  "pin_park",
]);

export type NotificationGroup = {
  key: string;
  ids: string[];
  representative: EnrichedNotificationRow;
  pinCount: number;
  created_at: string;
  read_at: string | null;
};

export type NotificationPinPlace = {
  id: string;
  placeName: string;
  countryName: string | null;
  typeLabel: string;
  href: string | null;
};

function isPinNotification(type: NotificationType): boolean {
  return PIN_NOTIFICATION_TYPES.has(type);
}

/** Same local clock hour, e.g. 19:00–19:59. */
function hourBucket(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}`;
}

/**
 * Collapse pin notifications from the same actor within the same hour into one row.
 * Input should be newest-first.
 */
export function groupNotifications(
  notifications: EnrichedNotificationRow[]
): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  const pinGroupIndex = new Map<string, number>();

  for (const notification of notifications) {
    if (!isPinNotification(notification.type) || !notification.actor_id) {
      groups.push({
        key: notification.id,
        ids: [notification.id],
        representative: notification,
        pinCount: 1,
        created_at: notification.created_at,
        read_at: notification.read_at,
      });
      continue;
    }

    const key = `${notification.actor_id}:${hourBucket(notification.created_at)}`;
    const existingIndex = pinGroupIndex.get(key);

    if (existingIndex != null) {
      const group = groups[existingIndex]!;
      group.ids.push(notification.id);
      group.pinCount += 1;
      if (!notification.read_at) {
        group.read_at = null;
      }
      continue;
    }

    pinGroupIndex.set(key, groups.length);
    groups.push({
      key,
      ids: [notification.id],
      representative: notification,
      pinCount: 1,
      created_at: notification.created_at,
      read_at: notification.read_at,
    });
  }

  return groups;
}

type NotificationPlaceLabels = {
  country: string;
  city: string;
  park: string;
  place: string;
  aPlace: string;
  localizeCity: (countryCode: string, cityName: string) => string;
};

function pinTypeLabel(type: NotificationType, labels: NotificationPlaceLabels): string {
  switch (type) {
    case "pin_country":
      return labels.country;
    case "pin_city":
      return labels.city;
    case "pin_park":
      return labels.park;
    default:
      return labels.place;
  }
}

export function notificationGroupPinPlaces(
  group: NotificationGroup,
  notifications: EnrichedNotificationRow[],
  labels: NotificationPlaceLabels
): NotificationPinPlace[] {
  const byId = new Map(notifications.map((item) => [item.id, item]));

  return group.ids
    .map((id) => byId.get(id))
    .filter((item): item is EnrichedNotificationRow => Boolean(item))
    .map((item) => {
      const payload = item.payload as NotificationPayload;
      const rawPlaceName = payload.placeName ?? labels.aPlace;
      return {
        id: item.id,
        placeName:
          item.type === "pin_city"
            ? labels.localizeCity(payload.countryCode ?? "", rawPlaceName)
            : rawPlaceName,
        countryName:
          typeof payload.countryName === "string" && payload.countryName
            ? payload.countryName
            : null,
        typeLabel: pinTypeLabel(item.type, labels),
        href: notificationTargetHref(item),
      };
    });
}
