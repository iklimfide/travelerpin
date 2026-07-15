"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAddDestination } from "@/components/add/AddDestinationProvider";
import { BottomBarProfileNav } from "@/components/dashboard/BottomBarProfileNav";
import type { BottomBarOwnProfile } from "@/components/dashboard/OwnProfileShellGate";
import { PublicGuestAuthLinks } from "@/components/nav/PublicGuestAuthLinks";
import { NotificationsNavLink } from "@/components/notifications/NotificationsNavLink";
import { useIsDesktopDashboardNav } from "@/lib/hooks/useIsDesktopDashboardNav";
import { useVisualViewportFixed } from "@/lib/hooks/useVisualViewportFixed";
import {
  commonMessages,
  dashboardNavMessages,
} from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";

type DashboardBottomBarProps = {
  ownProfile: BottomBarOwnProfile | null;
};

function loginHrefFor(pathname: string): string {
  return `/login?next=${encodeURIComponent(pathname)}`;
}

function registerHrefFor(pathname: string): string {
  return `/register?next=${encodeURIComponent(pathname)}`;
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="6" cy="18" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M7.6 16.8 10.4 13.2M13.6 10.8 16.4 7.2" strokeLinecap="round" />
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

function NavLink({
  item,
  pathname,
  className = "",
}: {
  item: NavItem;
  pathname: string;
  className?: string;
}) {
  const active = item.isActive(pathname);

  return (
    <Link
      href={item.href}
      className={`dashboard-bottom-bar__item${active ? " dashboard-bottom-bar__item--active" : ""}${className ? ` ${className}` : ""}`}
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
  const { open: openAddDestination } = useAddDestination();
  const barRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const isDesktopNav = useIsDesktopDashboardNav();
  const currentPath = pathname ?? "/";
  const username = ownProfile?.username ?? null;
  const isGuest = !username;
  // Guests always use the top bar (mobile + desktop); signed-in users only on desktop.
  const showTopChrome = isDesktopNav || isGuest;
  const mapHref = username ? profilePath(username) : loginHrefFor(currentPath);
  const brandHref = username ? profilePath(username) : "/";
  const loginHref = loginHrefFor(currentPath);
  const registerHref = registerHrefFor(currentPath);

  useEffect(() => {
    setMounted(true);
  }, []);

  useVisualViewportFixed(barRef, { enabled: !showTopChrome });

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
    openAddDestination();
  }

  function handleNextRouteClick() {
    if (!username) {
      router.push(loginHrefFor(currentPath));
      return;
    }
    router.push(`/c/next?next=${encodeURIComponent(currentPath)}`);
  }

  function handleWishlistClick() {
    if (!username) {
      router.push(loginHrefFor(currentPath));
      return;
    }
    router.push(`/c/wishlist?next=${encodeURIComponent(currentPath)}`);
  }

  const profileNav = (
    <BottomBarProfileNav
      ownProfile={ownProfile}
      loginHref={loginHref}
      menuPlacement={showTopChrome ? "below" : "above"}
      showBarDestinationsInMenu={isDesktopNav && Boolean(username)}
      mapHref={mapHref}
      mapActive={mapItem.isActive(pathname)}
      onNextRouteClick={handleNextRouteClick}
      onWishlistClick={handleWishlistClick}
    />
  );

  const notificationsNav = <NotificationsNavLink variant="bottomBar" />;

  const bar = (
    <nav
      ref={barRef}
      className={`dashboard-bottom-bar${showTopChrome ? " dashboard-bottom-bar--top" : ""}`}
      aria-label="Dashboard navigation"
    >
      <div className="dashboard-bottom-bar__inner">
        {showTopChrome ? (
          <>
            <Link href={brandHref} className="dashboard-top-bar__brand">
              <img
                src="/apple-touch-icon.png"
                alt=""
                width={32}
                height={32}
                className="dashboard-top-bar__brand-logo"
              />
              <span className="dashboard-top-bar__brand-label">TravelerPin.com</span>
            </Link>
            <div className="dashboard-top-bar__actions">
              {isGuest ? (
                <PublicGuestAuthLinks
                  loginHref={loginHref}
                  registerHref={registerHref}
                  loginLabel={commonMessages.login}
                  registerLabel={commonMessages.register}
                  className="dashboard-top-bar__auth-links"
                  linkClassName="dashboard-top-bar__auth-link"
                  primaryClassName="dashboard-top-bar__auth-link dashboard-top-bar__auth-link--primary"
                />
              ) : (
                <>
                  {notificationsNav}
                  {profileNav}
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`dashboard-bottom-bar__item${
                pathname === "/c/next" ? " dashboard-bottom-bar__item--active" : ""
              }`}
              aria-label={dashboardNavMessages.nextRoute}
              onClick={handleNextRouteClick}
            >
              <span className="dashboard-bottom-bar__icon">
                <RouteIcon />
              </span>
              <span className="dashboard-bottom-bar__label">{dashboardNavMessages.nextRoute}</span>
            </button>
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
            {notificationsNav}
            {profileNav}
          </>
        )}
      </div>
    </nav>
  );

  if (!mounted) return null;

  const desktopAddFab =
    isDesktopNav && !isGuest ? (
      <button
        type="button"
        className="dashboard-desktop-add-fab"
        aria-label={dashboardNavMessages.add}
        onClick={handleAddClick}
      >
        <PlusIcon />
      </button>
    ) : null;

  return createPortal(
    <>
      {bar}
      {desktopAddFab}
    </>,
    document.body,
  );
}
