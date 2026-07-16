"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { OwnProfileShell } from "@/components/dashboard/OwnProfileShell";
import {
  getOwnUserId,
  getOwnUsername,
  setOwnUserId,
  setOwnUsername,
} from "@/lib/client/session-page-cache";
import { createClient } from "@/lib/supabase/client";

export type BottomBarOwnProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  displayName: string | null;
};

function readProvisionalOwnProfile(): BottomBarOwnProfile | null {
  const userId = getOwnUserId();
  const username = getOwnUsername();
  if (!userId || !username) return null;
  return {
    id: userId,
    username,
    avatarUrl: null,
    displayName: null,
  };
}

/**
 * App chrome (footer + top/bottom nav) for all users.
 *
 * Resolves guest vs signed-in chrome in useLayoutEffect (before paint) from
 * localStorage so logged-in users never flash the guest top bar. Footer stays
 * pinned to the viewport bottom via dashboard-shell flex + min-height.
 */
export function OwnProfileShellGate({ children }: { children: ReactNode }) {
  const [ownProfile, setOwnProfile] = useState<BottomBarOwnProfile | null>(null);
  const [chromeReady, setChromeReady] = useState(false);

  useLayoutEffect(() => {
    const provisional = readProvisionalOwnProfile();
    if (provisional) {
      setOwnProfile(provisional);
    }
    setChromeReady(true);
  }, []);

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
      }

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
    } = supabase.auth.onAuthStateChange((event) => {
      // Ignore noisy token refresh; SIGNED_IN / SIGNED_OUT / INITIAL_SESSION matter.
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "INITIAL_SESSION" ||
        event === "USER_UPDATED"
      ) {
        void loadUsername();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <OwnProfileShell ownProfile={ownProfile} chromeReady={chromeReady}>
      {children}
    </OwnProfileShell>
  );
}
