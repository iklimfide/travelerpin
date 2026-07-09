"use client";

import { useEffect, useState, type ReactNode } from "react";
import { OwnProfileShell } from "@/components/dashboard/OwnProfileShell";
import { createClient } from "@/lib/supabase/client";

/**
 * Loads the signed-in username in the browser so the root layout does not
 * need a server-side auth/profile round-trip on every request.
 *
 * Always mounts OwnProfileShell (bottom bar for guests too). Must stay inside
 * DashboardAddProvider (layout) so the bottom bar can open SaveDestinationModal.
 *
 * Broken / conflicting auth cookies are cleared and the shell continues as guest.
 */
export function OwnProfileShellGate({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function recoverAsGuest() {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      if (!cancelled) setUsername(null);
    }

    async function loadUsername() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          if (error) await recoverAsGuest();
          else if (!cancelled) setUsername(null);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          // Auth ok but profile lookup failed — stay signed in without username.
          if (!cancelled) setUsername(null);
          return;
        }

        if (!cancelled) setUsername(profile?.username ?? null);

        // Backfill home-city pin once per browser session (e.g. residence "İstanbul").
        if (profile?.username) {
          const flagKey = `tp:ensure-residence:${user.id}`;
          try {
            if (sessionStorage.getItem(flagKey) === "1") return;
            sessionStorage.setItem(flagKey, "1");
          } catch {
            // Private mode / blocked storage — still attempt once this mount.
          }
          void fetch("/api/profile/ensure-residence", { method: "POST" }).catch(() => {
            try {
              sessionStorage.removeItem(flagKey);
            } catch {
              // ignore
            }
          });
        }
      } catch {
        await recoverAsGuest();
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

  // Bottom bar always mounts (guests included); username fills in after auth.
  return <OwnProfileShell username={username}>{children}</OwnProfileShell>;
}
