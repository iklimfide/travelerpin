"use client";

import { useEffect, useState, type ReactNode } from "react";
import { OwnProfileShell } from "@/components/dashboard/OwnProfileShell";
import { createClient } from "@/lib/supabase/client";

/**
 * Loads the signed-in username in the browser so the root layout does not
 * need a server-side auth/profile round-trip on every request.
 *
 * OwnProfileShell mounts the bottom bar once auth resolves. Must stay inside
 * DashboardAddProvider (layout) so the bottom bar can open SaveDestinationModal.
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

  return username ? <OwnProfileShell username={username}>{children}</OwnProfileShell> : children;
}
