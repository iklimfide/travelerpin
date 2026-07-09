import type { ReactNode } from "react";
import { DashboardBottomBar } from "@/components/dashboard/DashboardBottomBar";
import { NotificationsProvider } from "@/components/notifications/NotificationsProvider";
import { OwnProfileDataProvider } from "@/components/profile/OwnProfileDataProvider";

type OwnProfileShellProps = {
  /** Null for guests — bottom bar still shows; protected actions ask to sign in. */
  username: string | null;
  children: ReactNode;
};

/** Bottom bar for everyone. Own-profile cache + notifications when signed in. */
export function OwnProfileShell({ username, children }: OwnProfileShellProps) {
  const shell = (
    <div className="dashboard-shell">
      {children}
      <DashboardBottomBar username={username} />
    </div>
  );

  if (!username) return shell;

  return (
    <OwnProfileDataProvider username={username}>
      <NotificationsProvider username={username}>{shell}</NotificationsProvider>
    </OwnProfileDataProvider>
  );
}
