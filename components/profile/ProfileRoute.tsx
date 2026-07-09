"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { ProfileOwnerTools } from "@/components/dashboard/ProfileOwnerTools";
import { PublicProfileViewClient } from "@/components/profile/PublicProfileViewClient";
import {
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

  useEffect(() => {
    const cached = readProfileCache(normalized);
    if (cached) {
      setData(cached);
      setMissing(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      const res = await fetch(`/api/profile/${encodeURIComponent(normalized)}/page-data`);
      if (cancelled) return;

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
    })();

    return () => {
      cancelled = true;
    };
  }, [normalized]);

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
