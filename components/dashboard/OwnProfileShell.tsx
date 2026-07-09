import type { ReactNode } from "react";
import { DashboardBottomBar } from "@/components/dashboard/DashboardBottomBar";
import type { BottomBarOwnProfile } from "@/components/dashboard/OwnProfileShellGate";
import { NotificationsProvider } from "@/components/notifications/NotificationsProvider";

type OwnProfileShellProps = {
  ownProfile: BottomBarOwnProfile | null;
  children: ReactNode;
};

/** Bottom bar for all users; notifications when signed in. Requires DashboardAddProvider above. */
export function OwnProfileShell({ ownProfile, children }: OwnProfileShellProps) {
  const shell = (
    <div className="dashboard-shell">
      {children}
      <DashboardBottomBar ownProfile={ownProfile} />
    </div>
  );

  if (!ownProfile) return shell;

  return <NotificationsProvider username={ownProfile.username}>{shell}</NotificationsProvider>;
}