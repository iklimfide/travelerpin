"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";

type OwnProfileDataContextValue = {
  username: string;
  data: PublicProfilePageData | null;
  ready: boolean;
  seed: (data: PublicProfilePageData) => void;
  invalidate: () => void;
  ensureLoaded: () => Promise<void>;
  revalidate: () => void;
};

const OwnProfileDataContext = createContext<OwnProfileDataContextValue | null>(null);

export function useOwnProfileData(): OwnProfileDataContextValue | null {
  return useContext(OwnProfileDataContext);
}

/** True when navigating to the signed-in user's own profile and cache is warm. */
export function useOwnProfileCacheHit(routeUsername: string | undefined | null): boolean {
  const ctx = useOwnProfileData();
  if (!ctx?.data || !ctx.username || !routeUsername) return false;
  return ctx.username.toLowerCase() === routeUsername.trim().toLowerCase();
}

type OwnProfileDataProviderProps = {
  username: string;
  children: ReactNode;
};

export function OwnProfileDataProvider({ username, children }: OwnProfileDataProviderProps) {
  const [data, setData] = useState<PublicProfilePageData | null>(null);
  const [ready, setReady] = useState(false);
  const inFlight = useRef<Promise<void> | null>(null);
  const usernameKey = username.trim().toLowerCase();

  const fetchOwn = useCallback(async (opts?: { force?: boolean }) => {
    if (!opts?.force && inFlight.current) {
      await inFlight.current;
      return;
    }

    const run = (async () => {
      try {
        const res = await fetch("/api/me/profile-page", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) {
          if (res.status === 401) setData(null);
          return;
        }
        const json = (await res.json()) as PublicProfilePageData;
        if (json.profile?.username?.toLowerCase() !== usernameKey) return;
        setData(json);
      } catch {
        // Keep previous cache on network errors.
      } finally {
        setReady(true);
        inFlight.current = null;
      }
    })();

    inFlight.current = run;
    await run;
  }, [usernameKey]);

  const seed = useCallback(
    (next: PublicProfilePageData) => {
      if (next.profile.username.toLowerCase() !== usernameKey) return;
      setData(next);
      setReady(true);
    },
    [usernameKey]
  );

  const invalidate = useCallback(() => {
    setData(null);
    setReady(false);
    void fetchOwn({ force: true });
  }, [fetchOwn]);

  const ensureLoaded = useCallback(async () => {
    if (data) return;
    await fetchOwn({ force: true });
  }, [data, fetchOwn]);

  const revalidate = useCallback(() => {
    void fetchOwn();
  }, [fetchOwn]);

  // Warm cache once when the signed-in shell mounts.
  useEffect(() => {
    void fetchOwn();
  }, [fetchOwn]);

  const value = useMemo(
    () => ({
      username: usernameKey,
      data,
      ready,
      seed,
      invalidate,
      ensureLoaded,
      revalidate,
    }),
    [usernameKey, data, ready, seed, invalidate, ensureLoaded, revalidate]
  );

  return (
    <OwnProfileDataContext.Provider value={value}>{children}</OwnProfileDataContext.Provider>
  );
}
