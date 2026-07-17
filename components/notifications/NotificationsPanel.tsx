"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { EnrichedNotificationRow } from "@/types/database";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/client/notification-actions";
import { formatMessage, notificationMessages, shareMessages, useAppMessages } from "@/lib/i18n/client-messages";
import {
  notificationActorProfileHref,
  notificationTargetHref,
  SYSTEM_NOTIFICATION_SENDER,
  type NotificationPayload,
} from "@/lib/supabase/notifications";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import {
  groupNotifications,
  notificationGroupPinPlaces,
  type NotificationGroup,
} from "@/lib/utils/notification-groups";

function resolveActorName(
  notification: EnrichedNotificationRow,
  payload: NotificationPayload
): string {
  if (notification.type === "system") {
    return payload.actorDisplayName ?? SYSTEM_NOTIFICATION_SENDER.displayName;
  }
  return (
    payload.actorDisplayName ??
    (notification.actorProfile
      ? resolveProfileDisplayName(
          notification.actorProfile.display_name,
          notification.actorProfile.username
        )
      : undefined) ??
    payload.actorUsername ??
    "A traveler"
  );
}

function formatGroupBody(group: NotificationGroup): string {
  const notification = group.representative;
  const payload = notification.payload as NotificationPayload;
  const name = resolveActorName(notification, payload);
  const place = payload.placeName ?? "a place";

  if (group.pinCount > 1) {
    return formatMessage(notificationMessages.pin_batch, {
      name,
      count: group.pinCount,
    });
  }

  switch (notification.type) {
    case "follow":
      return formatMessage(notificationMessages.follow, { name });
    case "pin_country":
      return formatMessage(notificationMessages.pin_country, { name, place });
    case "pin_city":
      return formatMessage(notificationMessages.pin_city, { name, place });
    case "pin_park":
      return formatMessage(notificationMessages.pin_park, { name, place });
    case "pin_media":
      return formatMessage(notificationMessages.pin_media, { name, place });
    case "system": {
      const message =
        typeof payload.message === "string" && payload.message.trim()
          ? payload.message.trim()
          : "";
      const title =
        typeof payload.title === "string" && payload.title.trim()
          ? payload.title.trim()
          : "";
      if (title && message && title !== message) {
        return formatMessage(notificationMessages.system_with_title, {
          name,
          title,
          message,
        });
      }
      return formatMessage(notificationMessages.system, {
        name,
        message: message || title || "",
      });
    }
    default:
      return name;
  }
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function resolveActorAvatar(
  notification: EnrichedNotificationRow,
  payload: NotificationPayload
): string | null {
  if (typeof payload.actorAvatarUrl === "string" && payload.actorAvatarUrl) {
    return payload.actorAvatarUrl;
  }
  if (notification.type === "system") {
    return SYSTEM_NOTIFICATION_SENDER.avatarUrl;
  }
  return notification.actorProfile?.avatar_url ?? null;
}

function resolveActorUsername(
  notification: EnrichedNotificationRow,
  payload: NotificationPayload
): string {
  if (notification.type === "system") return "travelerpin";
  return (
    payload.actorUsername ??
    notification.actorProfile?.username ??
    "traveler"
  );
}

function resolveActorDisplayName(
  notification: EnrichedNotificationRow,
  payload: NotificationPayload
): string {
  if (notification.type === "system") {
    return payload.actorDisplayName ?? SYSTEM_NOTIFICATION_SENDER.displayName;
  }
  if (payload.actorDisplayName) return payload.actorDisplayName;
  if (notification.actorProfile) {
    return resolveProfileDisplayName(
      notification.actorProfile.display_name,
      notification.actorProfile.username
    );
  }
  return payload.actorUsername ?? "Traveler";
}

type NotificationsPanelProps = {
  variant?: "page" | "modal";
  onClose?: () => void;
  initialNotifications?: EnrichedNotificationRow[];
  initialUnreadCount?: number;
};

export function NotificationsPanel({
  variant = "page",
  onClose,
  initialNotifications,
  initialUnreadCount = 0,
}: NotificationsPanelProps) {
  const { share: shareMessages, notifications: notificationMessages } = useAppMessages();
  const router = useRouter();
  const [notifications, setNotifications] = useState<EnrichedNotificationRow[]>(
    initialNotifications ?? []
  );
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(variant === "modal" && !initialNotifications);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [detailGroup, setDetailGroup] = useState<NotificationGroup | null>(null);
  const isModal = variant === "modal";

  const groups = useMemo(() => groupNotifications(notifications), [notifications]);
  const detailPlaces = useMemo(
    () => (detailGroup ? notificationGroupPinPlaces(detailGroup, notifications) : []),
    [detailGroup, notifications]
  );

  useEffect(() => {
    if (!initialNotifications) return;
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
    setLoading(false);
    setError(null);
  }, [initialNotifications, initialUnreadCount]);

  useEffect(() => {
    if (!isModal || initialNotifications) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchNotifications().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    });

    return () => {
      cancelled = true;
    };
  }, [isModal, initialNotifications]);

  async function markGroupRead(group: NotificationGroup) {
    const unreadIds = group.ids.filter((id) => {
      const row = notifications.find((item) => item.id === id);
      return row && !row.read_at;
    });

    if (unreadIds.length === 0) return;

    await Promise.all(unreadIds.map((id) => markNotificationRead(id)));
    const readAt = new Date().toISOString();
    const unreadIdSet = new Set(unreadIds);
    setNotifications((current) =>
      current.map((item) =>
        unreadIdSet.has(item.id) ? { ...item, read_at: readAt } : item
      )
    );
    setUnreadCount((count) => Math.max(0, count - unreadIds.length));
  }

  async function handleOpen(group: NotificationGroup) {
    await markGroupRead(group);

    if (group.pinCount > 1) {
      setDetailGroup(group);
      return;
    }

    const href = notificationTargetHref(group.representative);
    if (href) {
      onClose?.();
      router.push(href);
    }
  }

  function handleOpenPlace(href: string | null) {
    if (!href) return;
    onClose?.();
    router.push(href);
  }

  function handleOpenProfile() {
    if (!detailGroup) return;
    const href = notificationActorProfileHref(detailGroup.representative);
    if (!href) return;
    onClose?.();
    router.push(href);
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      const ok = await markAllNotificationsRead();
      if (!ok) return;
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read_at: item.read_at ?? new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      router.refresh();
    });
  }

  const detailPayload = detailGroup
    ? (detailGroup.representative.payload as NotificationPayload)
    : null;
  const detailName = detailGroup
    ? resolveActorName(detailGroup.representative, detailPayload ?? {})
    : "";

  return (
    <div className={`notifications-page${isModal ? " notifications-page--modal" : ""}`}>
      <div
        className={`notifications-page__head${isModal ? " notifications-page__head--modal" : ""}${
          detailGroup ? " notifications-page__head--detail" : ""
        }`}
      >
        {detailGroup ? (
          <>
            <button
              type="button"
              className="notifications-page__back"
              onClick={() => setDetailGroup(null)}
            >
              ← {notificationMessages.pin_batch_back}
            </button>
            {notificationActorProfileHref(detailGroup.representative) ? (
              <button
                type="button"
                id="notifications-modal-title"
                className="notifications-page__title notifications-page__actor-name w-full min-w-0 cursor-pointer border-0 bg-transparent p-0 text-inherit hover:underline"
                onClick={handleOpenProfile}
              >
                {detailName}
              </button>
            ) : (
              <h1 id="notifications-modal-title" className="notifications-page__title">
                {detailName}
              </h1>
            )}
            {isModal && onClose ? (
              <div className="notifications-page__actions">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={shareMessages.close}
                  className="notifications-page__close"
                >
                  <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <span className="notifications-page__head-spacer" aria-hidden="true" />
            )}
          </>
        ) : (
          <>
            <h1 id="notifications-modal-title" className="notifications-page__title">
              {notificationMessages.title}
            </h1>
            <div className="notifications-page__actions">
              {!isModal ? (
                <button
                  type="button"
                  className="notifications-page__mark-all"
                  onClick={handleMarkAllRead}
                  disabled={pending}
                >
                  {notificationMessages.markAllRead}
                </button>
              ) : null}
              {isModal && onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={shareMessages.close}
                  className="notifications-page__close"
                >
                  <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className={isModal ? "notifications-page__body" : undefined}>
        {detailGroup ? (
          <>
            <ul className="notifications-list notifications-list--places">
              {detailPlaces.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    className="notifications-item"
                    onClick={() => handleOpenPlace(place.href)}
                    disabled={!place.href}
                  >
                    <span className="notifications-item__body">
                      <span className="notifications-item__copy">
                        <span className="notifications-item__text">{place.placeName}</span>{" "}
                        <span className="notifications-item__time">
                          {place.countryName
                            ? `${place.typeLabel} · ${place.countryName}`
                            : place.typeLabel}
                        </span>
                      </span>
                    </span>
                    {place.href ? (
                      <span className="notifications-item__chevron" aria-hidden>
                        ›
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : loading ? (
          <p className="notifications-page__empty">{notificationMessages.loading}</p>
        ) : error ? (
          <p className="notifications-page__empty notifications-page__status--error">{error}</p>
        ) : groups.length === 0 ? (
          <p className="notifications-page__empty">{notificationMessages.empty}</p>
        ) : (
          <ul className="notifications-list">
            {groups.map((group) => {
              const notification = group.representative;
              const payload = notification.payload as NotificationPayload;
              const unread = !group.read_at;
              const href =
                group.pinCount > 1
                  ? true
                  : Boolean(notificationTargetHref(notification));
              const username = resolveActorUsername(notification, payload);
              const displayName = resolveActorDisplayName(notification, payload);

              return (
                <li key={group.key}>
                  <button
                    type="button"
                    className={`notifications-item${unread ? " notifications-item--unread" : ""}`}
                    onClick={() => void handleOpen(group)}
                  >
                    <ProfileAvatar
                      avatarUrl={resolveActorAvatar(notification, payload)}
                      displayName={displayName}
                      username={username}
                      size="xs"
                      className="notifications-item__avatar shrink-0 !ring-1 !ring-slate-200"
                    />
                    <span className="notifications-item__body">
                      <span className="notifications-item__copy">
                        <span className="notifications-item__text">{formatGroupBody(group)}</span>{" "}
                        <span className="notifications-item__time">{formatWhen(group.created_at)}</span>
                      </span>
                    </span>
                    {href ? <span className="notifications-item__chevron" aria-hidden>›</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isModal && onClose ? (
        <div className="notifications-page__footer">
          {!detailGroup ? (
            <button
              type="button"
              className="notifications-page__mark-all"
              onClick={handleMarkAllRead}
              disabled={pending}
            >
              {notificationMessages.markAllRead}
            </button>
          ) : null}
          <button type="button" className="notifications-page__modal-close" onClick={onClose}>
            {shareMessages.close}
          </button>
        </div>
      ) : null}
    </div>
  );
}
