"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/components/notifications/NotificationsProvider";
import { fetchNotifications } from "@/lib/client/notification-actions";

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
  const { openNotifications, isOpen } = useNotifications();
  const active = pathname.startsWith("/notifications");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await fetchNotifications();
      if (!cancelled && result.ok) setUnreadCount(result.unreadCount);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname, isOpen]);

  const isHero = variant === "hero";
  const buttonClass = isHero
    ? `profile-hero-notifications${active ? " profile-hero-notifications--active" : ""}`
    : `dashboard-bottom-bar__item${active ? " dashboard-bottom-bar__item--active" : ""}`;
  const iconClass = isHero
    ? "profile-hero-notifications__icon profile-hero-notifications__icon--badge-host"
    : "dashboard-bottom-bar__icon dashboard-bottom-bar__icon--badge-host";
  const badgeClass = isHero ? "profile-hero-notifications__badge" : "dashboard-bottom-bar__badge";

  return (
    <button
      type="button"
      className={buttonClass}
      aria-current={active ? "page" : undefined}
      aria-label="Notifications"
      onClick={openNotifications}
    >
      <span className={iconClass}>
        <BellIcon />
        {unreadCount > 0 ? (
          <span className={badgeClass} aria-label={`${unreadCount} unread notifications`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </span>
    </button>
  );
}
