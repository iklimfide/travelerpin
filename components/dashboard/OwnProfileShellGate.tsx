"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DashboardAddProvider } from "@/components/dashboard/DashboardAddProvider";
import { OwnProfileShell } from "@/components/dashboard/OwnProfileShell";
import { createClient } from "@/lib/supabase/client";

/**
 * Loads the signed-in username in the browser so the root layout does not
 * need a server-side auth/profile round-trip on every request.
 *
 * DashboardAddProvider always wraps the tree so own-profile tools
 * (ProfileOwnerTools) can call useDashboardAdd during SSR / first paint,
 * before client auth resolves and the bottom bar mounts.
 */
export function OwnProfileShellGate({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadUsername() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setUsername(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) setUsername(profile?.username ?? null);

      // Backfill home-city pin for accounts with residence (e.g. "İstanbul").
      if (profile?.username) {
        void fetch("/api/profile/ensure-residence", { method: "POST" }).catch(() => {
          // Non-blocking; profile page also attempts this.
        });
      }
    }

    void loadUsername();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUsername();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <DashboardAddProvider>
      {username ? <OwnProfileShell username={username}>{children}</OwnProfileShell> : children}
    </DashboardAddProvider>
  );
}
