"use client";

import { useEffect, useState, type ReactNode } from "react";
import { OwnProfileShell } from "@/components/dashboard/OwnProfileShell";
import { setOwnUserId, setOwnUsername } from "@/lib/client/session-page-cache";
import { createClient } from "@/lib/supabase/client";

export type BottomBarOwnProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  displayName: string | null;
};
/**
 * Loads the signed-in username in the browser so the root layout does not
 * need a server-side auth/profile round-trip on every request.
 *
 * OwnProfileShell mounts the bottom bar for guests and signed-in users once
 * auth resolves. Must stay inside DashboardAddProvider (layout) so the bottom
 * bar can open SaveDestinationModal.
 */
export function OwnProfileShellGate({ children }: { children: ReactNode }) {
  const [ownProfile, setOwnProfile] = useState<BottomBarOwnProfile | null>(null);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadUsername() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setOwnProfile(null);
          setOwnUserId(null);
          setOwnUsername(null);
          setAuthResolved(true);
        }
        return;
      }

      setOwnUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url, display_name, residence")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setOwnProfile(
          profile?.username
            ? {
                id: user.id,
                username: profile.username,
                avatarUrl: profile.avatar_url ?? null,
                displayName: profile.display_name ?? null,
              }
            : null
        );
        setOwnUsername(profile?.username ?? null);
        setAuthResolved(true);
      }

      // Backfill home-city pin once per browser session (e.g. residence "İstanbul").
      if (profile?.username && profile.residence?.trim()) {
        const flagKey = `tp:ensure-residence:${user.id}`;
        try {
          if (sessionStorage.getItem(flagKey) === "1") return;
          sessionStorage.setItem(flagKey, "1");
        } catch {
          // Private mode / blocked storage — still attempt once this mount.
        }
        void fetch("/api/profile/ensure-residence", { method: "POST" })
          .then((res) => {
            if (res.ok) return;
            try {
              sessionStorage.removeItem(flagKey);
            } catch {
              // ignore
            }
          })
          .catch(() => {
            try {
              sessionStorage.removeItem(flagKey);
            } catch {
              // ignore
            }
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

  return authResolved ? (
    <OwnProfileShell ownProfile={ownProfile}>{children}</OwnProfileShell>
  ) : (
    children
  );
}
