"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthGate } from "@/components/auth/useAuthGate";
import { useDashboardAdd } from "@/components/dashboard/DashboardAddProvider";
import { NotificationsNavLink } from "@/components/notifications/NotificationsNavLink";
import { useOwnProfileData } from "@/components/profile/OwnProfileDataProvider";
import { commonMessages, dashboardNavMessages } from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";

type DashboardBottomBarProps = {
  /** Null for guests — protected items open the login modal. */
  username: string | null;
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

/** Folded map with a location pin on top. */
function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path
        d="M4 9.2 8.8 7.4l6.2 2.2L20 7.8v9.6l-5 1.8-6.2-2.2L4 18.8V9.2Z"
        strokeLinejoin="round"
      />
      <path d="M8.8 7.4v9.6M15 9.6v9.6" strokeLinecap="round" />
      <path
        d="M12 2.6c-1.55 0-2.8 1.2-2.8 2.7 0 2.05 2.8 4.55 2.8 4.55S14.8 7.35 14.8 5.3c0-1.5-1.25-2.7-2.8-2.7Z"
        fill="currentColor"
        stroke="none"
      />
      <circle cx="12" cy="5.25" r="0.95" fill="#fff" stroke="none" />
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

function navAvatarInitials(displayName: string, username: string): string {
  const source = displayName.trim() || username;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function NavProfileAvatar({
  avatarUrl,
  displayName,
  username,
}: {
  avatarUrl: string | null;
  displayName: string;
  username: string;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold leading-none text-white"
      aria-hidden
    >
      {navAvatarInitials(displayName, username)}
    </span>
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width={26} height={26} aria-hidden fill="none" stroke="currentColor" strokeWidth={2.4}>
      <path d="M12 6v12M6 12h12" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 3a5 5 0 0 0-5 5v2.2c0 .7-.2 1.4-.6 2L5 14.5h14l-1.4-2.3c-.4-.6-.6-1.3-.6-2V8a5 5 0 0 0-5-5Z" strokeLinejoin="round" />
      <path d="M10 17.5a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19.5c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M10 4.5H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5A2.25 2.25 0 0 0 6.75 19.5H10" strokeLinecap="round" />
      <path d="M14.5 8.5 18.5 12l-4 3.5M18.25 12H10" strokeLinecap="round" strokeLinejoin="round" />
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
  onWarm,
}: {
  item: NavItem;
  pathname: string;
  onWarm?: () => void;
}) {
  const active = item.isActive(pathname);

  return (
    <Link
      href={item.href}
      className={`dashboard-bottom-bar__item${active ? " dashboard-bottom-bar__item--active" : ""}`}
      aria-current={active ? "page" : undefined}
      onMouseEnter={onWarm}
      onFocus={onWarm}
      onTouchStart={onWarm}
    >
      <span className="dashboard-bottom-bar__icon">{item.icon}</span>
      <span className="dashboard-bottom-bar__label">{item.label}</span>
    </Link>
  );
}

function GuestNavButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`dashboard-bottom-bar__item${active ? " dashboard-bottom-bar__item--active" : ""}`}
      onClick={onClick}
    >
      <span className="dashboard-bottom-bar__icon">{icon}</span>
      <span className="dashboard-bottom-bar__label">{label}</span>
    </button>
  );
}

function ProfileAccountMenu({
  username,
  avatarUrl,
  displayName,
  profileHref,
  onWarm,
}: {
  username: string;
  avatarUrl: string | null;
  displayName: string;
  profileHref: string;
  onWarm: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const profileActive = pathname === profileHref;
  const settingsActive = pathname.startsWith("/settings");

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-1 justify-center">
      <button
        type="button"
        className="dashboard-bottom-bar__item !bg-transparent hover:!bg-transparent"
        aria-label={commonMessages.openMenu}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          setOpen((prev) => !prev);
          onWarm();
        }}
        onMouseEnter={onWarm}
        onFocus={onWarm}
        onTouchStart={onWarm}
      >
        <span className="dashboard-bottom-bar__icon">
          <NavProfileAvatar avatarUrl={avatarUrl} displayName={displayName} username={username} />
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={commonMessages.openMenu}
          className="absolute bottom-[calc(100%+8px)] right-0 z-50 min-w-[168px] overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_12px_32px_rgba(25,43,68,0.16)]"
        >
          <Link
            role="menuitem"
            href={profileHref}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold no-underline transition-colors ${
              profileActive ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setOpen(false)}
          >
            <PersonIcon />
            {dashboardNavMessages.profile}
          </Link>
          <Link
            role="menuitem"
            href="/settings"
            className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold no-underline transition-colors ${
              settingsActive ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setOpen(false)}
          >
            <SettingsIcon />
            {dashboardNavMessages.settings}
          </Link>
          <div className="my-1 border-t border-slate-100" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              void (async () => {
                await fetch("/auth/signout", { method: "POST" });
                window.location.assign("/");
              })();
            }}
          >
            <LogoutIcon />
            {commonMessages.logout}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DashboardBottomBar({ username }: DashboardBottomBarProps) {
  const pathname = usePathname();
  const { openAddModal } = useDashboardAdd();
  const { requireLogin } = useAuthGate();
  const ownProfile = useOwnProfileData();
  const isGuest = !username;

  const homeItem: NavItem = {
    href: "/",
    label: dashboardNavMessages.home,
    isActive: (path) => path === "/",
    icon: <HomeIcon />,
  };

  const profileHref = username ? profilePath(username) : null;
  const ownProfileRow = ownProfile?.data?.profile;
  const profileDisplayName = ownProfileRow
    ? resolveProfileDisplayName(ownProfileRow.display_name, ownProfileRow.username)
    : username ?? "";

  const mapItem: NavItem | null = profileHref
    ? {
        href: profileHref,
        label: commonMessages.dashboard,
        isActive: (path) => path === profileHref,
        icon: <MapPinIcon />,
      }
    : null;

  function handleProtectedClick() {
    requireLogin();
  }

  function warmOwnProfile() {
    if (ownProfile?.data) {
      ownProfile.revalidate();
      return;
    }
    void ownProfile?.ensureLoaded();
  }

  return (
    <nav className="dashboard-bottom-bar" aria-label="Dashboard navigation">
      <div className="dashboard-bottom-bar__inner">
        <NavLink item={homeItem} pathname={pathname} />

        {isGuest || !mapItem ? (
          <GuestNavButton
            label={commonMessages.dashboard}
            icon={<MapPinIcon />}
            onClick={handleProtectedClick}
          />
        ) : (
          <NavLink item={mapItem} pathname={pathname} onWarm={warmOwnProfile} />
        )}

        <div className="dashboard-bottom-bar__add-slot">
          <button
            type="button"
            className="dashboard-bottom-bar__add"
            aria-label={dashboardNavMessages.add}
            onClick={() => {
              if (isGuest) {
                requireLogin();
                return;
              }
              openAddModal();
            }}
          >
            <PlusIcon />
          </button>
        </div>

        {isGuest ? (
          <GuestNavButton
            label={dashboardNavMessages.notifications}
            icon={<BellIcon />}
            active={pathname.startsWith("/notifications")}
            onClick={handleProtectedClick}
          />
        ) : (
          <NotificationsNavLink variant="bottomBar" />
        )}

        {isGuest || !profileHref || !username ? (
          <GuestNavButton
            label={dashboardNavMessages.profile}
            icon={<ProfileIcon />}
            onClick={handleProtectedClick}
          />
        ) : (
          <ProfileAccountMenu
            username={username}
            avatarUrl={ownProfileRow?.avatar_url ?? null}
            displayName={profileDisplayName}
            profileHref={profileHref}
            onWarm={warmOwnProfile}
          />
        )}
      </div>
    </nav>
  );
}
