"use client";

import { useCallback, useEffect, useRef } from "react";
import { PROFILE_DATA_STALE_EVENT } from "@/lib/client/session-page-cache";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-types";

/** Refetch profile page-data when pin/profile caches go stale — no full RSC refresh. */
export function useProfileStaleReload(
  username: string,
  enabled: boolean,
  onReload: (data: PublicProfilePageData) => void
): void {
  const normalized = username.trim().toLowerCase();
  const onReloadRef = useRef(onReload);
  onReloadRef.current = onReload;

  const reload = useCallback(async () => {
    const res = await fetch(`/api/profile/${encodeURIComponent(normalized)}/page-data`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    onReloadRef.current((await res.json()) as PublicProfilePageData);
  }, [normalized]);

  useEffect(() => {
    if (!enabled) return;

    function onStale(event: Event) {
      const detail = (event as CustomEvent<{ username?: string }>).detail;
      const target = detail?.username?.trim().toLowerCase();
      if (target && target !== normalized) return;
      void reload();
    }

    window.addEventListener(PROFILE_DATA_STALE_EVENT, onStale);
    return () => window.removeEventListener(PROFILE_DATA_STALE_EVENT, onStale);
  }, [enabled, normalized, reload]);
}
