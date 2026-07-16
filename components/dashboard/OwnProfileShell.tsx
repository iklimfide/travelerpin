import type { ReactNode } from "react";
import { DashboardBottomBar } from "@/components/dashboard/DashboardBottomBar";
import type { BottomBarOwnProfile } from "@/components/dashboard/OwnProfileShellGate";
import { NotificationsProvider } from "@/components/notifications/NotificationsProvider";
import { SiteFooter } from "@/components/layout/SiteFooter";

type OwnProfileShellProps = {
  ownProfile: BottomBarOwnProfile | null;
  /** False until client has resolved guest vs signed-in chrome (before paint). */
  chromeReady: boolean;
  children: ReactNode;
};

/** App chrome for all users; notifications when signed in. Requires DashboardAddProvider above. */
export function OwnProfileShell({
  ownProfile,
  chromeReady,
  children,
}: OwnProfileShellProps) {
  const shellClass = [
    "dashboard-shell",
    !chromeReady ? "dashboard-shell--booting" : "",
    chromeReady && !ownProfile ? "dashboard-shell--guest" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const shell = (
    <>
      <div className={shellClass}>
        {children}
        {/* Keep footer in the flex layout so min-height + mt-auto pin it to the
            bottom of the viewport while content/skeleton loads — never mid-screen. */}
        <SiteFooter />
      </div>
      {chromeReady ? <DashboardBottomBar ownProfile={ownProfile} /> : null}
    </>
  );

  if (!ownProfile) return shell;

  return <NotificationsProvider username={ownProfile.username}>{shell}</NotificationsProvider>;
}
