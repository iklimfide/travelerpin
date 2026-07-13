"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BottomBarOwnProfile } from "@/components/dashboard/OwnProfileShellGate";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { commonMessages, dashboardNavMessages, shareMessages, wishlistMessages } from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";
import { clearAllSessionPageCaches } from "@/lib/client/session-page-cache";

type BottomBarProfileNavProps = {
  ownProfile: BottomBarOwnProfile | null;
  loginHref: string;
  menuPlacement?: "above" | "below";
  showBarDestinationsInMenu?: boolean;
  mapHref?: string;
  mapActive?: boolean;
  onNextRouteClick?: () => void;
  onWishlistClick?: () => void;
};

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
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        d="M10.3 4.3c.43-1.76 2.92-1.76 3.35 0a1.72 1.72 0 0 0 2.57 1.07c1.54-.94 3.31.83 2.37 2.37a1.72 1.72 0 0 0 1.07 2.57c1.76.43 1.76 2.92 0 3.35a1.72 1.72 0 0 0-1.07 2.57c.94 1.54-.83 3.31-2.37 2.37a1.72 1.72 0 0 0-2.57 1.07c-.43 1.76-2.92 1.76-3.35 0a1.72 1.72 0 0 0-2.57-1.07c-1.54.94-3.31-.83-2.37-2.37a1.72 1.72 0 0 0-1.07-2.57c-1.76-.43-1.76-2.92 0-3.35a1.72 1.72 0 0 0 1.07-2.57c-.94-1.54.83-3.31 2.37-2.37.99.61 2.3.07 2.57-1.07Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="6" cy="18" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M7.6 16.8 10.4 13.2M13.6 10.8 16.4 7.2" strokeLinecap="round" />
    </svg>
  );
}

function WishlistIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        d="M12 20.5s-7.2-4.6-9.4-8.8C1.1 8.2 3.2 5 6.6 5c1.9 0 3.4 1 4.4 2.4C12 6 13.5 5 15.4 5c3.4 0 5.5 3.2 3.9 6.7C19.2 15.9 12 20.5 12 20.5Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
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

function LogOutIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M15 12H4" strokeLinecap="round" />
      <path d="M11 8l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 5.5V4.8A1.8 1.8 0 0 1 10.8 3h8.4A1.8 1.8 0 0 1 21 4.8v14.4a1.8 1.8 0 0 1-1.8 1.8H10.8A1.8 1.8 0 0 1 9 19.2v-.7" strokeLinecap="round" />
    </svg>
  );
}

type MenuPosition = {
  top: number;
  right: number;
};

const MENU_GAP_PX = 8;
const MENU_MIN_INSET_PX = 12;

function getMenuPosition(button: HTMLElement, placement: "above" | "below"): MenuPosition {
  const rect = button.getBoundingClientRect();
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;

  return {
    top: placement === "below" ? rect.bottom + MENU_GAP_PX : rect.top - MENU_GAP_PX,
    right: Math.max(MENU_MIN_INSET_PX, viewportWidth - rect.right),
  };
}

export function BottomBarProfileNav({
  ownProfile,
  loginHref,
  menuPlacement = "above",
  showBarDestinationsInMenu = false,
  mapHref,
  mapActive = false,
  onNextRouteClick,
  onWishlistClick,
}: BottomBarProfileNavProps) {
  const pathname = usePathname();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const username = ownProfile?.username ?? null;
  const profileHref = username ? profilePath(username) : loginHref;
  const profileDisplayName = ownProfile?.displayName?.trim() || username || "";
  const active = Boolean(username) && pathname === profileHref;
  const profileSharesMapHref = showBarDestinationsInMenu && mapHref === profileHref;
  const profileMenuActive = active && !profileSharesMapHref;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    const button = triggerRef.current;
    if (!button) return;

    const syncPosition = () => {
      setMenuPosition(getMenuPosition(button, menuPlacement));
    };

    syncPosition();

    const viewport = window.visualViewport;
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);
    viewport?.addEventListener("resize", syncPosition);
    viewport?.addEventListener("scroll", syncPosition);

    return () => {
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
      viewport?.removeEventListener("resize", syncPosition);
      viewport?.removeEventListener("scroll", syncPosition);
    };
  }, [open, menuPlacement]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleLogout() {
    setOpen(false);
    clearAllSessionPageCaches();
    await fetch("/auth/signout", { method: "POST" });
    window.location.assign("/");
  }

  if (!username) {
    return (
      <Link
        href={loginHref}
        className="dashboard-bottom-bar__item"
        aria-label={dashboardNavMessages.profile}
      >
        <span className="dashboard-bottom-bar__icon">
          <ProfileIcon />
        </span>
        <span className="dashboard-bottom-bar__label">{dashboardNavMessages.profile}</span>
      </Link>
    );
  }

  const menuStyle: CSSProperties | undefined = menuPosition
    ? {
        top: menuPosition.top,
        right: menuPosition.right,
      }
    : undefined;

  const menuLayer =
    open && menuPosition && mounted
      ? createPortal(
          <>
            <button
              type="button"
              className="dashboard-profile-menu__backdrop"
              aria-label={shareMessages.close}
              onClick={() => setOpen(false)}
            />
            <div
              id={menuId}
              role="menu"
              className={`dashboard-profile-menu${
                menuPlacement === "below" ? " dashboard-profile-menu--below" : ""
              }`}
              style={menuStyle}
            >
              {menuPlacement === "below" ? (
                <>
                  <Link
                    href={profileHref}
                    role="menuitem"
                    className={`dashboard-profile-menu__item${profileMenuActive ? " dashboard-profile-menu__item--active" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className="dashboard-profile-menu__icon" aria-hidden>
                      <ProfileIcon />
                    </span>
                    {dashboardNavMessages.profile}
                  </Link>
                  {showBarDestinationsInMenu && mapHref ? (
                    <Link
                      href={mapHref}
                      role="menuitem"
                      className={`dashboard-profile-menu__item${
                        mapActive ? " dashboard-profile-menu__item--active" : ""
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      <span className="dashboard-profile-menu__icon" aria-hidden>
                        <MapPinIcon />
                      </span>
                      {dashboardNavMessages.map}
                    </Link>
                  ) : null}
                  {showBarDestinationsInMenu && onNextRouteClick ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="dashboard-profile-menu__item"
                      onClick={() => {
                        setOpen(false);
                        onNextRouteClick();
                      }}
                    >
                      <span className="dashboard-profile-menu__icon" aria-hidden>
                        <RouteIcon />
                      </span>
                      {dashboardNavMessages.nextRoute}
                    </button>
                  ) : null}
                  {showBarDestinationsInMenu && onWishlistClick ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="dashboard-profile-menu__item"
                      onClick={() => {
                        setOpen(false);
                        onWishlistClick();
                      }}
                    >
                      <span className="dashboard-profile-menu__icon" aria-hidden>
                        <WishlistIcon />
                      </span>
                      {dashboardNavMessages.wishlist}
                    </button>
                  ) : null}
                  <Link
                    href="/settings"
                    role="menuitem"
                    className={`dashboard-profile-menu__item${
                      pathname.startsWith("/settings") ? " dashboard-profile-menu__item--active" : ""
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <span className="dashboard-profile-menu__icon" aria-hidden>
                      <SettingsIcon />
                    </span>
                    {dashboardNavMessages.settings}
                  </Link>
                  <div className="dashboard-profile-menu__divider" role="presentation" />
                  <button
                    type="button"
                    role="menuitem"
                    className="dashboard-profile-menu__item dashboard-profile-menu__item--logout"
                    onClick={() => void handleLogout()}
                  >
                    <span className="dashboard-profile-menu__icon" aria-hidden>
                      <LogOutIcon />
                    </span>
                    {commonMessages.logout}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="dashboard-profile-menu__item dashboard-profile-menu__item--logout"
                    onClick={() => void handleLogout()}
                  >
                    <span className="dashboard-profile-menu__icon" aria-hidden>
                      <LogOutIcon />
                    </span>
                    {commonMessages.logout}
                  </button>
                  <div className="dashboard-profile-menu__divider" role="presentation" />
                  <Link
                    href={profileHref}
                    role="menuitem"
                    className={`dashboard-profile-menu__item${profileMenuActive ? " dashboard-profile-menu__item--active" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className="dashboard-profile-menu__icon" aria-hidden>
                      <ProfileIcon />
                    </span>
                    {dashboardNavMessages.profile}
                  </Link>
                  {onNextRouteClick ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="dashboard-profile-menu__item"
                      onClick={() => {
                        setOpen(false);
                        onNextRouteClick();
                      }}
                    >
                      <span className="dashboard-profile-menu__icon" aria-hidden>
                        <RouteIcon />
                      </span>
                      {dashboardNavMessages.nextRoute}
                    </button>
                  ) : null}
                  {onWishlistClick ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="dashboard-profile-menu__item"
                      onClick={() => {
                        setOpen(false);
                        onWishlistClick();
                      }}
                    >
                      <span className="dashboard-profile-menu__icon" aria-hidden>
                        <WishlistIcon />
                      </span>
                      {dashboardNavMessages.wishlist}
                    </button>
                  ) : null}
                  <Link
                    href="/settings"
                    role="menuitem"
                    className={`dashboard-profile-menu__item${
                      pathname.startsWith("/settings") ? " dashboard-profile-menu__item--active" : ""
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <span className="dashboard-profile-menu__icon" aria-hidden>
                      <SettingsIcon />
                    </span>
                    {dashboardNavMessages.settings}
                  </Link>
                </>
              )}
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <div className="dashboard-bottom-bar__profile-slot">
      <button
        ref={triggerRef}
        type="button"
        className={`dashboard-bottom-bar__item dashboard-bottom-bar__item--profile-avatar dashboard-bottom-bar__item--icon-only${
          active ? " dashboard-bottom-bar__item--active" : ""
        }${open ? " dashboard-bottom-bar__item--menu-open" : ""}`}
        aria-label={dashboardNavMessages.profile}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="dashboard-bottom-bar__icon">
          <ProfileAvatar
            avatarUrl={ownProfile?.avatarUrl ?? null}
            displayName={profileDisplayName}
            username={username}
            size="xs"
            className="dashboard-bottom-bar__avatar !ring-0"
          />
        </span>
      </button>

      {menuLayer}
    </div>
  );
}
