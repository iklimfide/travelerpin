"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BottomBarOwnProfile } from "@/components/dashboard/OwnProfileShellGate";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { commonMessages, dashboardNavMessages, shareMessages } from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";
import { clearAllSessionPageCaches } from "@/lib/client/session-page-cache";

type BottomBarProfileNavProps = {
  ownProfile: BottomBarOwnProfile | null;
  loginHref: string;
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

function LogOutIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M15 12H4" strokeLinecap="round" />
      <path d="M11 8l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 5.5V4.8A1.8 1.8 0 0 1 10.8 3h8.4A1.8 1.8 0 0 1 21 4.8v14.4a1.8 1.8 0 0 1-1.8 1.8H10.8A1.8 1.8 0 0 1 9 19.2v-.7" strokeLinecap="round" />
    </svg>
  );
}

export function BottomBarProfileNav({ ownProfile, loginHref }: BottomBarProfileNavProps) {
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);

  const username = ownProfile?.username ?? null;
  const profileHref = username ? profilePath(username) : loginHref;
  const profileDisplayName = ownProfile?.displayName?.trim() || username || "";
  const active = Boolean(username) && pathname === profileHref;

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

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

  return (
    <div className="dashboard-bottom-bar__profile-slot">
      <button
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

      {open ? (
        <>
          <button
            type="button"
            className="dashboard-profile-menu__backdrop"
            aria-label={shareMessages.close}
            onClick={() => setOpen(false)}
          />
          <div id={menuId} role="menu" className="dashboard-profile-menu">
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
              className="dashboard-profile-menu__item"
              onClick={() => setOpen(false)}
            >
              <span className="dashboard-profile-menu__icon" aria-hidden>
                <ProfileIcon />
              </span>
              {dashboardNavMessages.profile}
            </Link>
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
          </div>
        </>
      ) : null}
    </div>
  );
}
