"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BottomBarProfileNav } from "@/components/dashboard/BottomBarProfileNav";
import { useDashboardAdd } from "@/components/dashboard/DashboardAddProvider";
import type { BottomBarOwnProfile } from "@/components/dashboard/OwnProfileShellGate";
import { NotificationsNavLink } from "@/components/notifications/NotificationsNavLink";
import { dashboardNavMessages } from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";

type DashboardBottomBarProps = {
  ownProfile: BottomBarOwnProfile | null;
};

function loginHrefFor(pathname: string): string {
  return `/login?next=${encodeURIComponent(pathname)}`;
}

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

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        d="M8.5 4.2 4 6v13.8l4.5-2.2L13 19.8l4.5-2.2L22 19.8V6l-4.5-1.8L13 6.2 8.5 4.2Z"
        strokeLinejoin="round"
      />
      <path
        d="M13 8.8a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M13 13.2v2.2" strokeLinecap="round" />
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

export function DashboardBottomBar({ ownProfile }: DashboardBottomBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { openAddModal } = useDashboardAdd();
  const currentPath = pathname ?? "/";
  const username = ownProfile?.username ?? null;
  const mapHref = username ? profilePath(username) : loginHrefFor(currentPath);

  const homeItem: NavItem = {
    href: "/",
    label: dashboardNavMessages.home,
    isActive: (path) => path === "/",
    icon: <HomeIcon />,
  };

  const mapItem: NavItem = {
    href: mapHref,
    label: dashboardNavMessages.map,
    isActive: (path) => Boolean(username) && path === mapHref,
    icon: <MapPinIcon />,
  };

  function handleAddClick() {
    if (!username) {
      router.push(loginHrefFor(currentPath));
      return;
    }
    openAddModal();
  }

  return (
    <nav className="dashboard-bottom-bar" aria-label="Dashboard navigation">
      <div className="dashboard-bottom-bar__inner">
        <NavLink item={homeItem} pathname={pathname} />
        <NavLink item={mapItem} pathname={pathname} />

        <div className="dashboard-bottom-bar__add-slot">
          <button
            type="button"
            className="dashboard-bottom-bar__add"
            aria-label={dashboardNavMessages.add}
            onClick={handleAddClick}
          >
            <PlusIcon />
          </button>
        </div>

        <NotificationsNavLink variant="bottomBar" />
        <BottomBarProfileNav ownProfile={ownProfile} loginHref={loginHrefFor(currentPath)} />
      </div>
    </nav>
  );
}
