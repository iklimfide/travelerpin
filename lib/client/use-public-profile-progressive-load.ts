"use client";

import { useLayoutEffect, useCallback, useEffect, useMemo, useState } from "react";
import {
  PROFILE_DATA_STALE_EVENT,
  TRAVEL_STATE_UPDATED_EVENT,
  getOwnUsername,
  readProfileCache,
  writeProfileCache,
  type ProfileDataStaleDetail,
  type TravelStateData,
} from "@/lib/client/session-page-cache";
import { writeFollowStateCache } from "@/lib/client/follow-cache";
import { prefetchProfileFollowLists } from "@/lib/client/follow-actions";
import {
  createEmptyProfilePageData,
  mergeTravelStateIntoProfilePageData,
  type PublicProfilePageData,
  type PublicProfileShellData,
} from "@/lib/supabase/profile-page-types";
import { computeTravelStats, getVisitedCountryCodes } from "@/lib/utils/stats";

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

export function usePublicProfileProgressiveLoad(
  shell: PublicProfileShellData,
  enabled: boolean
) {
  const normalized = shell.profile.username.trim().toLowerCase();
  // Never read session cache during render — SSR and the first client pass must match.
  const [fullData, setFullData] = useState<PublicProfilePageData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const shellFallbackData = useMemo(() => createEmptyProfilePageData(shell), [shell]);

  useLayoutEffect(() => {
    if (!enabled) return;

    const cached = readProfileCache(normalized);
    if (!cached) return;

    setFullData(cached);
    setLoading(false);
    if (cached.followState) {
      writeFollowStateCache(normalized, cached.followState);
      prefetchProfileFollowLists(
        normalized,
        cached.followState.followerCount,
        cached.followState.followingCount
      );
    }
  }, [enabled, normalized]);

  const load = useCallback(
    async (forceNetwork = false) => {
      if (!enabled) return;

      if (!forceNetwork) {
        const cached = readProfileCache(normalized);
        if (cached) {
          setFullData(cached);
          setLoading(false);
          if (cached.followState) {
            writeFollowStateCache(normalized, cached.followState);
            prefetchProfileFollowLists(
              normalized,
              cached.followState.followerCount,
              cached.followState.followingCount
            );
          }
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
        if (payload.followState) {
          writeFollowStateCache(normalized, payload.followState);
          prefetchProfileFollowLists(
            normalized,
            payload.followState.followerCount,
            payload.followState.followingCount
          );
        }
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
      // Cache is kept fresh via PROFILE_DATA_STALE_EVENT / travel-state sync.
      return;
    }

    void load(false);
  }, [enabled, load, normalized]);

  useEffect(() => {
    if (!enabled) return;

    function onTravelStateUpdated(event: Event) {
      const own = getOwnUsername();
      if (!own || own !== normalized) return;

      const travel = (event as CustomEvent<{ data: TravelStateData }>).detail?.data;
      if (!travel) return;

      const cached = readProfileCache(normalized);
      const next =
        cached ??
        mergeTravelStateIntoProfilePageData(shellFallbackData, travel);

      setFullData(next);
      setLoading(false);
    }

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
        setFullData((prev) => {
          const base = prev ?? readProfileCache(normalized);
          if (!base) return prev;
          const next = applyOptimisticRemovals(base, detail);
          writeProfileCache(normalized, next);
          return next;
        });
      }

      void load(true);
    }

    window.addEventListener(TRAVEL_STATE_UPDATED_EVENT, onTravelStateUpdated);
    window.addEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
    return () => {
      window.removeEventListener(TRAVEL_STATE_UPDATED_EVENT, onTravelStateUpdated);
      window.removeEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
    };
  }, [enabled, load, normalized, shellFallbackData]);

  const data = fullData ?? shellFallbackData;

  return { data, fullData, loading, reload: load };
}
