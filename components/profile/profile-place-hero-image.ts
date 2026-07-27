"use client";

import { useEffect, useState } from "react";
import { DEFAULT_CITY_HERO_IMAGE } from "@/lib/constants";
import { resolveCityHeroImageUrl } from "@/lib/city/city-hero-images";
import { getCityHubBySlug } from "@/lib/data/city-hubs";
import { getParkHubBySlug } from "@/lib/data/park-hubs";
import {
  fetchHeroImageMaps,
  readCachedCityHeroImages,
  readCachedParkHeroImages,
} from "@/lib/client/hero-images-cache";
import { resolveParkHeroImageUrl } from "@/lib/park/park-hero-images";
import { getDefaultParkHeroImage } from "@/lib/utils/park-hero-image";
import type { ParkType } from "@/types/database";

function isDefaultCityHero(url: string | null | undefined): boolean {
  if (!url?.trim()) return true;
  return url === DEFAULT_CITY_HERO_IMAGE || url.includes("city-default");
}

function isDefaultParkHero(url: string | null | undefined, parkType: ParkType): boolean {
  if (!url?.trim()) return true;
  const fallback = getDefaultParkHeroImage(parkType);
  return url === fallback || url.includes("park-default") || url.includes("theme-park-default");
}

/** Hub/catalog English name for YP hero lookup (not localized card title). */
export function profileCityHeroLookupName(citySlug: string | null, displayName: string): string {
  if (citySlug) {
    const hub = getCityHubBySlug(citySlug);
    if (hub?.name) return hub.name;
  }
  return displayName;
}

export function profileParkHeroLookupName(parkSlug: string | null, displayName: string): string {
  if (parkSlug) {
    const hub = getParkHubBySlug(parkSlug);
    if (hub?.name) return hub.name;
  }
  return displayName;
}

export function useProfileCityHeroImage(
  countryCode: string,
  lookupCityName: string,
  initialUrl: string | null
): string {
  const seeded = initialUrl?.trim() ? initialUrl.trim() : DEFAULT_CITY_HERO_IMAGE;
  const [displayUrl, setDisplayUrl] = useState(seeded);

  useEffect(() => {
    setDisplayUrl(initialUrl?.trim() ? initialUrl.trim() : DEFAULT_CITY_HERO_IMAGE);
  }, [initialUrl, countryCode, lookupCityName]);

  useEffect(() => {
    const current = initialUrl?.trim() ? initialUrl.trim() : DEFAULT_CITY_HERO_IMAGE;
    if (!isDefaultCityHero(current)) return;

    let cancelled = false;

    const apply = (cityMap: Map<string, string>) => {
      const resolved = resolveCityHeroImageUrl(countryCode, lookupCityName, cityMap);
      if (cancelled || isDefaultCityHero(resolved)) return;
      setDisplayUrl(resolved);
    };

    const cached = readCachedCityHeroImages();
    if (cached && cached.size > 0) apply(cached);

    void fetchHeroImageMaps().then(({ cityHeroImages }) => {
      apply(cityHeroImages);
    });

    return () => {
      cancelled = true;
    };
  }, [countryCode, lookupCityName, initialUrl]);

  return displayUrl;
}

export function useProfileParkHeroImage(
  countryCode: string,
  lookupParkName: string,
  parkType: ParkType,
  initialUrl: string
): string {
  const [displayUrl, setDisplayUrl] = useState(initialUrl);

  useEffect(() => {
    setDisplayUrl(initialUrl);
  }, [initialUrl, countryCode, lookupParkName, parkType]);

  useEffect(() => {
    if (!isDefaultParkHero(initialUrl, parkType)) return;

    let cancelled = false;

    const apply = (parkMap: Map<string, string>) => {
      const resolved = resolveParkHeroImageUrl(
        countryCode,
        lookupParkName,
        parkType,
        parkMap
      );
      if (cancelled || isDefaultParkHero(resolved, parkType)) return;
      setDisplayUrl(resolved);
    };

    const cached = readCachedParkHeroImages();
    if (cached && cached.size > 0) apply(cached);

    void fetchHeroImageMaps().then(({ parkHeroImages }) => {
      apply(parkHeroImages);
    });

    return () => {
      cancelled = true;
    };
  }, [countryCode, lookupParkName, parkType, initialUrl]);

  return displayUrl;
}
