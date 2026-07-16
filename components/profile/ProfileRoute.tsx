"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
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
  // Never read localStorage during the initial render — SSR and the first
  // client paint must match. Cache is applied in useLayoutEffect before paint.
  const [data, setData] = useState<PublicProfilePageData | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(
    async (forceNetwork = false) => {
      if (!forceNetwork) {
        const cached = readProfileCache(normalized);
        if (cached) {
          setData(cached);
          setMissing(false);
          setLoading(false);
          return;
        }
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
        // Transient 5xx / cache failures — keep trying, do not convert to notFound.
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

  useLayoutEffect(() => {
    const cached = readProfileCache(normalized);
    if (cached) {
      setData(cached);
      setMissing(false);
      setLoading(false);
      return;
    }

    setData(null);
    setMissing(false);
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
    return loading ? <ProfilePageSkeleton /> : null;
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
