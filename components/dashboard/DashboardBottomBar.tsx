"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardAdd } from "@/components/dashboard/DashboardAddProvider";
import { NotificationsNavLink } from "@/components/notifications/NotificationsNavLink";
import { dashboardNavMessages } from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";

type DashboardBottomBarProps = {
  username: string;
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        d="M4.5 10.5 12 4.5l7.5 6v8.25a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V10.5Z"
        strokeLinejoin="round"
      />
      <path d="M9.75 19.5V12h4.5v7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19.5c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        d="M10.3 4.3c.43-1.76 2.92-1.76 3.35 0a1.72 1.72 0 0 0 2.57 1.07c1.54-.94 3.31.83 2.37 2.37a1.72 1.72 0 0 0 1.07 2.57c1.76.43 1.76 2.92 0 3.35a1.72 1.72 0 0 0-1.07 2.57c.94 1.54-.83 3.31-2.37 2.37a1.72 1.72 0 0 0-2.57 1.07c-.43 1.76-2.92 1.76-3.35 0a1.72 1.72 0 0 0-2.57-1.07c-1.54.94-3.31-.83-2.37-2.37a1.72 1.72 0 0 0-1.07-2.57c-1.76-.43-1.76-2.92 0-3.35a1.72 1.72 0 0 0 1.07-2.57c-.94-1.54.83-3.31 2.37-2.37.99.61 2.3.07 2.57-1.07Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width={26} height={26} aria-hidden fill="none" stroke="currentColor" strokeWidth={2.4}>
      <path d="M12 6v12M6 12h12" strokeLinecap="round" />
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  icon: ReactNode;
};

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.isActive(pathname);

  return (
    <Link
      href={item.href}
      className={`dashboard-bottom-bar__item${active ? " dashboard-bottom-bar__item--active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="dashboard-bottom-bar__icon">{item.icon}</span>
      <span className="dashboard-bottom-bar__label">{item.label}</span>
    </Link>
  );
}

export function DashboardBottomBar({ username }: DashboardBottomBarProps) {
  const pathname = usePathname();
  const { openAddModal } = useDashboardAdd();
  const profileHref = profilePath(username);

  const homeItem: NavItem = {
    href: "/",
    label: dashboardNavMessages.home,
    isActive: (path) => path === "/",
    icon: <HomeIcon />,
  };

  const profileItem: NavItem = {
    href: profileHref,
    label: dashboardNavMessages.profile,
    isActive: (path) => path === profileHref,
    icon: <ProfileIcon />,
  };

  const settingsItem: NavItem = {
    href: "/settings",
    label: dashboardNavMessages.settings,
    isActive: (path) => path.startsWith("/settings"),
    icon: <SettingsIcon />,
  };

  return (
    <nav className="dashboard-bottom-bar" aria-label="Dashboard navigation">
      <div className="dashboard-bottom-bar__inner">
        <NavLink item={homeItem} pathname={pathname} />
        <NavLink item={settingsItem} pathname={pathname} />

        <div className="dashboard-bottom-bar__add-slot">
          <button
            type="button"
            className="dashboard-bottom-bar__add"
            aria-label={dashboardNavMessages.add}
            onClick={() => openAddModal()}
          >
            <PlusIcon />
          </button>
        </div>

        <NavLink item={profileItem} pathname={pathname} />
        <NotificationsNavLink variant="bottomBar" />
      </div>
    </nav>
  );
}
