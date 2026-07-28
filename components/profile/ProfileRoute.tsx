"use client";

import { useCallback, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { ProfileOwnerTools } from "@/components/dashboard/ProfileOwnerTools";
import { PublicProfileViewClient } from "@/components/profile/PublicProfileViewClient";
import { ProfilePageSkeleton } from "@/components/skeletons/ProfilePageSkeleton";
import {
  PROFILE_DATA_STALE_EVENT,
  TRAVEL_STATE_UPDATED_EVENT,
  getOwnUsername,
  readProfileCache,
  writeProfileCache,
  type ProfileDataStaleDetail,
  type TravelStateData,
} from "@/lib/client/session-page-cache";
import { useCachedProfile } from "@/lib/client/use-page-cache";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-types";
import { mergeTravelStateIntoProfilePageData } from "@/lib/supabase/profile-page-types";
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
  if (detail.removeCityIds?.length) {
    const removeSet = new Set(detail.removeCityIds);
    visitedCities = visitedCities.filter((city) => !removeSet.has(city.id));
  }
  if (detail.removeParkId) {
    visitedParks = visitedParks.filter((park) => park.id !== detail.removeParkId);
  }
  if (detail.removeParkIds?.length) {
    const removeSet = new Set(detail.removeParkIds);
    visitedParks = visitedParks.filter((park) => !removeSet.has(park.id));
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
  return mergeTravelStateIntoProfilePageData(data, travel);
}

export function ProfileRoute({ username }: ProfileRouteProps) {
  const normalized = username.trim().toLowerCase();
  const cachedSnapshot = useCachedProfile(normalized);
  const [data, setData] = useState<PublicProfilePageData | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(() => !cachedSnapshot);

  const displayData = data ?? cachedSnapshot;

  const loadProfile = useCallback(
    async (forceNetwork = false, options?: { silent?: boolean }) => {
      if (!forceNetwork) {
        const cached = readProfileCache(normalized);
        if (cached) {
          setData(cached);
          setMissing(false);
          setLoading(false);
          return;
        }
      }

      if (!options?.silent) {
        setLoading(true);
      }

      const res = await fetch(`/api/profile/${encodeURIComponent(normalized)}/page-data`, {
        cache: "no-store",
      });

      if (res.status === 404) {
        setMissing(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setMissing(false);
        setLoading(false);
        return;
      }

      const payload = (await res.json()) as PublicProfilePageData;
      writeProfileCache(normalized, payload);
      setData(payload);
      setMissing(false);
      setLoading(false);
    },
    [normalized]
  );

  useEffect(() => {
    if (!cachedSnapshot) return;
    setData(cachedSnapshot);
    setMissing(false);
    setLoading(false);
  }, [cachedSnapshot]);

  useEffect(() => {
    if (readProfileCache(normalized)) {
      setLoading(false);
      void loadProfile(true, { silent: true });
      return;
    }

    setLoading(true);
    let cancelled = false;
    void (async () => {
      await loadProfile(false);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfile, normalized]);

  useEffect(() => {
    function onProfileStale(event: Event) {
      const detail = (event as CustomEvent<ProfileDataStaleDetail>).detail;
      const target = detail?.username ?? getOwnUsername();
      if (target && target !== normalized) return;

      if (
        detail?.removeCityId ||
        detail?.removeCityIds?.length ||
        detail?.removeParkId ||
        detail?.removeParkIds?.length
      ) {
        setData((prev) => (prev ? applyOptimisticRemovals(prev, detail) : prev));
      }

      void loadProfile(true, { silent: true });
    }

    function onTravelStateUpdated(event: Event) {
      const own = getOwnUsername();
      if (!own || own !== normalized) return;

      const travel = (event as CustomEvent<{ data: TravelStateData }>).detail?.data;
      if (!travel) return;

      // Cache is already synced by notifyTravelStateUpdated. Do not writeProfileCache
      // inside setState — it notifies useSyncExternalStore and re-enters ProfileRoute.
      setData((prev) => (prev ? applyTravelStateToProfile(prev, travel) : prev));
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

  if (!displayData) {
    return loading ? <ProfilePageSkeleton /> : null;
  }

  const { profile, currentUsername, isLoggedIn } = displayData;
  const isOwnProfile =
    currentUsername != null &&
    currentUsername.toLowerCase() === profile.username.toLowerCase();
  const isGuest = !isLoggedIn;

  return (
    <PublicProfileViewClient
      data={displayData}
      isOwnProfile={isOwnProfile}
      isGuest={isGuest}
      ownerTools={
        isOwnProfile ? (
          <ProfileOwnerTools
            visitedCountries={displayData.visitedCountries}
            visitedCities={displayData.visitedCities}
            visitedParks={displayData.visitedParks}
            wishlistCountries={displayData.wishlistCountries}
            visitedCodes={displayData.visitedCodes}
          />
        ) : undefined
      }
    />
  );
}
