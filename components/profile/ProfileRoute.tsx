"use client";

import { useCallback, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { ProfileOwnerTools } from "@/components/dashboard/ProfileOwnerTools";
import { PublicProfileViewClient } from "@/components/profile/PublicProfileViewClient";
import {
  PROFILE_DATA_STALE_EVENT,
  readProfileCache,
  writeProfileCache,
} from "@/lib/client/session-page-cache";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";

type ProfileRouteProps = {
  username: string;
};

export function ProfileRoute({ username }: ProfileRouteProps) {
  const normalized = username.trim().toLowerCase();
  const [data, setData] = useState<PublicProfilePageData | null>(null);
  const [missing, setMissing] = useState(false);

  const loadProfile = useCallback(
    async (forceNetwork = false) => {
      if (!forceNetwork) {
        const cached = readProfileCache(normalized);
        if (cached) {
          setData(cached);
          setMissing(false);
          return;
        }
      }

      const res = await fetch(`/api/profile/${encodeURIComponent(normalized)}/page-data`);

      if (res.status === 404) {
        setMissing(true);
        return;
      }

      if (!res.ok) {
        setMissing(true);
        return;
      }

      const payload = (await res.json()) as PublicProfilePageData;
      writeProfileCache(normalized, payload);
      setData(payload);
      setMissing(false);
    },
    [normalized]
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await loadProfile(false);
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  useEffect(() => {
    function onProfileStale(event: Event) {
      const detail = (event as CustomEvent<{ username?: string }>).detail;
      if (detail?.username && detail.username !== normalized) return;
      void loadProfile(true);
    }

    window.addEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
    return () => window.removeEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
  }, [loadProfile, normalized]);

  if (missing) {
    notFound();
  }

  if (!data) {
    return null;
  }

  const { profile, currentUsername, isLoggedIn } = data;
  const isOwnProfile = currentUsername === profile.username;
  const isGuest = !isLoggedIn;

  return (
    <PublicProfileViewClient
      data={data}
      isOwnProfile={isOwnProfile}
      isGuest={isGuest}
      ownerTools={
        isOwnProfile ? (
          <ProfileOwnerTools
            visitedCountries={data.visitedCountries}
            visitedCities={data.visitedCities}
            visitedParks={data.visitedParks}
            wishlistCountries={data.wishlistCountries}
            visitedCodes={data.visitedCodes}
          />
        ) : undefined
      }
    />
  );
}
