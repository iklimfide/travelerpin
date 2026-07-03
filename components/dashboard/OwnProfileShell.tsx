import type { ReactNode } from "react";
import { DashboardAddProvider } from "@/components/dashboard/DashboardAddProvider";
import { DashboardBottomBar } from "@/components/dashboard/DashboardBottomBar";
import { NotificationsProvider } from "@/components/notifications/NotificationsProvider";

type OwnProfileShellProps = {
  username: string;
  children: ReactNode;
};

export function OwnProfileShell({ username, children }: OwnProfileShellProps) {
  return (
    <DashboardAddProvider>
      <NotificationsProvider username={username}>
        <div className="dashboard-shell">
          {children}
          <DashboardBottomBar username={username} />
        </div>
      </NotificationsProvider>
    </DashboardAddProvider>
  );
}
