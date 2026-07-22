"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createEmptyProfilePageData,
  type PublicProfilePageData,
  type PublicProfileShellData,
} from "@/lib/supabase/profile-page-types";
import { getOwnUsername, readProfileCache, writeProfileCache } from "@/lib/client/session-page-cache";

export function usePublicProfileProgressiveLoad(
  shell: PublicProfileShellData,
  enabled: boolean
) {
  const normalized = shell.profile.username.trim().toLowerCase();
  // Never read session cache during render — SSR and the first client pass must match.
  const [fullData, setFullData] = useState<PublicProfilePageData | null>(null);
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(
    async (forceNetwork = false) => {
      if (!enabled) return;

      if (!forceNetwork) {
        const cached = readProfileCache(normalized);
        if (cached) {
          setFullData(cached);
          setLoading(false);
          return;
        }
      }

      setLoading(true);

      try {
        const res = await fetch(`/api/profile/${encodeURIComponent(normalized)}/page-data`, {
          cache: "no-store",
        });

        if (!res.ok) {
          setLoading(false);
          return;
        }

        const payload = (await res.json()) as PublicProfilePageData;
        writeProfileCache(normalized, payload);
        setFullData(payload);
      } catch {
        // Keep shell visible if the background fetch fails.
      } finally {
        setLoading(false);
      }
    },
    [enabled, normalized]
  );

  useEffect(() => {
    if (!enabled) return;

    const cached = readProfileCache(normalized);
    if (cached) {
      setFullData(cached);
      setLoading(false);
      if (getOwnUsername() !== normalized) {
        void load(true);
      }
      return;
    }

    void load(false);
  }, [enabled, load, normalized]);

  const data = fullData ?? createEmptyProfilePageData(shell);

  return { data, fullData, loading, reload: load };
}
