"use client";

import { useEffect, useRef } from "react";
import { useOwnProfileData } from "@/components/profile/OwnProfileDataProvider";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";

type OwnProfileCacheSeedProps = {
  data: PublicProfilePageData;
};

/** Seeds the client own-profile cache from SSR when viewing your own page. */
export function OwnProfileCacheSeed({ data }: OwnProfileCacheSeedProps) {
  const ctx = useOwnProfileData();
  const seededKey = useRef<string | null>(null);
  const seed = ctx?.seed;
  const key = `${data.profile.username}:${data.stats.countries}:${data.stats.cities}:${data.visitedCities.length}:${data.visitedParks.length}`;

  useEffect(() => {
    if (!seed) return;
    if (seededKey.current === key) return;
    seededKey.current = key;
    seed(data);
  }, [data, key, seed]);

  return null;
}
