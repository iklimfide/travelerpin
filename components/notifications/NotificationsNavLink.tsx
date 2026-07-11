"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NotificationsContext,
} from "@/components/notifications/NotificationsProvider";
import { fetchUnreadNotificationCount } from "@/lib/client/notification-actions";
import { dashboardNavMessages } from "@/lib/i18n/client-messages";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 3a5 5 0 0 0-5 5v2.2c0 .7-.2 1.4-.6 2L5 14.5h14l-1.4-2.3c-.4-.6-.6-1.3-.6-2V8a5 5 0 0 0-5-5Z" strokeLinejoin="round" />
      <path d="M10 17.5a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

type NotificationsNavLinkProps = {
  variant?: "bottomBar" | "hero";
};

export function NotificationsNavLink({ variant = "bottomBar" }: NotificationsNavLinkProps) {
  const pathname = usePathname();
  const notifications = useContext(NotificationsContext);
  const active = pathname.startsWith("/notifications");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const count = await fetchUnreadNotificationCount();
      if (!cancelled) setUnreadCount(count);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname, notifications?.isOpen]);

  const isHero = variant === "hero";
  const buttonClass = isHero
    ? `profile-hero-notifications${active ? " profile-hero-notifications--active" : ""}`
    : `dashboard-bottom-bar__item${active ? " dashboard-bottom-bar__item--active" : ""}`;
  const iconClass = isHero
    ? "profile-hero-notifications__icon profile-hero-notifications__icon--badge-host"
    : "dashboard-bottom-bar__icon dashboard-bottom-bar__icon--badge-host";
  const badgeClass = isHero ? "profile-hero-notifications__badge" : "dashboard-bottom-bar__badge";

  const icon = (
    <span className={iconClass}>
      <BellIcon />
      {unreadCount > 0 ? (
        <span className={badgeClass} aria-label={`${unreadCount} unread notifications`}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </span>
  );

  const bottomBarLabel = !isHero ? (
    <span className="dashboard-bottom-bar__label">{dashboardNavMessages.notifications}</span>
  ) : null;

  // OwnProfileShellGate mounts the provider only after client auth resolves.
  // Fall back to a link so SSR / first paint does not crash.
  if (!notifications) {
    return (
      <Link
        href="/notifications"
        className={buttonClass}
        aria-current={active ? "page" : undefined}
        aria-label="Notifications"
      >
        {icon}
        {bottomBarLabel}
      </Link>
    );
  }

  return (
    <button
      ref={notifications.triggerRef}
      type="button"
      className={buttonClass}
      aria-current={active ? "page" : undefined}
      aria-label="Notifications"
      onClick={notifications.openNotifications}
    >
      {icon}
      {bottomBarLabel}
    </button>
  );
}
