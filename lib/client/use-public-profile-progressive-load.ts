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
  const [fullData, setFullData] = useState<PublicProfilePageData | null>(() => {
    if (!enabled) return null;
    return readProfileCache(normalized);
  });
  const [loading, setLoading] = useState(() => enabled && !readProfileCache(normalized));

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
