import type { ReactNode } from "react";
import { DashboardBottomBar } from "@/components/dashboard/DashboardBottomBar";
import { NotificationsProvider } from "@/components/notifications/NotificationsProvider";

type OwnProfileShellProps = {
  username: string;
  children: ReactNode;
};

/** Bottom bar + notifications for signed-in users. Requires DashboardAddProvider above. */
export function OwnProfileShell({ username, children }: OwnProfileShellProps) {
  return (
    <NotificationsProvider username={username}>
      <div className="dashboard-shell">
        {children}
        <DashboardBottomBar username={username} />
      </div>
    </NotificationsProvider>
  );
}
