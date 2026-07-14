"use client";

import { useCallback, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { ProfileOwnerTools } from "@/components/dashboard/ProfileOwnerTools";
import { PublicProfileViewClient } from "@/components/profile/PublicProfileViewClient";
import {
  PROFILE_DATA_STALE_EVENT,
  TRAVEL_STATE_UPDATED_EVENT,
  getOwnUsername,
  readProfileCache,
  writeProfileCache,
  type ProfileDataStaleDetail,
  type TravelStateData,
} from "@/lib/client/session-page-cache";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";
import { computeTravelStats, getVisitedCountryCodes } from "@/lib/utils/stats";

type ProfileRouteProps = {
  username: string;
};

function applyOptimisticRemovals(
  data: PublicProfilePageData,
  detail: ProfileDataStaleDetail
): PublicProfilePageData {
  let visitedCities = data.visitedCities;
  let visitedParks = data.visitedParks;

  if (detail.removeCityId) {
    visitedCities = visitedCities.filter((city) => city.id !== detail.removeCityId);
  }
  if (detail.removeParkId) {
    visitedParks = visitedParks.filter((park) => park.id !== detail.removeParkId);
  }
  if (visitedCities === data.visitedCities && visitedParks === data.visitedParks) {
    return data;
  }

  const visitedCodes = getVisitedCountryCodes(
    data.visitedCountries,
    visitedCities,
    visitedParks
  );

  return {
    ...data,
    visitedCities,
    visitedParks,
    visitedCodes,
    stats: computeTravelStats(data.visitedCountries, visitedCities, visitedParks),
  };
}

function applyTravelStateToProfile(
  data: PublicProfilePageData,
  travel: TravelStateData
): PublicProfilePageData {
  return {
    ...data,
    visitedCountries: travel.visitedCountries,
    visitedCities: travel.visitedCities,
    visitedParks: travel.visitedParks,
    wishlistCountries: travel.wishlistCountries,
    visitedCodes: travel.visitedCodes,
    stats: travel.stats,
  };
}

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

      const res = await fetch(`/api/profile/${encodeURIComponent(normalized)}/page-data`, {
        cache: "no-store",
      });

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
      const detail = (event as CustomEvent<ProfileDataStaleDetail>).detail;
      const target = detail?.username ?? getOwnUsername();
      if (target && target !== normalized) return;

      if (detail?.removeCityId || detail?.removeParkId) {
        setData((prev) => (prev ? applyOptimisticRemovals(prev, detail) : prev));
      }

      void loadProfile(true);
    }

    function onTravelStateUpdated(event: Event) {
      const own = getOwnUsername();
      if (!own || own !== normalized) return;

      const travel = (event as CustomEvent<{ data: TravelStateData }>).detail?.data;
      if (!travel) return;

      setData((prev) => {
        if (!prev) return prev;
        const next = applyTravelStateToProfile(prev, travel);
        writeProfileCache(normalized, next);
        return next;
      });
    }

    window.addEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
    window.addEventListener(TRAVEL_STATE_UPDATED_EVENT, onTravelStateUpdated);
    return () => {
      window.removeEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
      window.removeEventListener(TRAVEL_STATE_UPDATED_EVENT, onTravelStateUpdated);
    };
  }, [loadProfile, normalized]);

  if (missing) {
    notFound();
  }

  if (!data) {
    return null;
  }

  const { profile, currentUsername, isLoggedIn } = data;
  const isOwnProfile =
    currentUsername != null &&
    currentUsername.toLowerCase() === profile.username.toLowerCase();
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
