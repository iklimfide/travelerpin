"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  PAGE_CACHE_CHANGED_EVENT,
  PROFILE_DATA_STALE_EVENT,
  TRAVEL_STATE_UPDATED_EVENT,
  readProfileCache,
  readSettingsCache,
  type CachedSettingsPayload,
} from "@/lib/client/session-page-cache";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-types";

function subscribePageCache(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(PAGE_CACHE_CHANGED_EVENT, onChange);
  window.addEventListener(PROFILE_DATA_STALE_EVENT, onChange);
  window.addEventListener(TRAVEL_STATE_UPDATED_EVENT, onChange);
  return () => {
    window.removeEventListener(PAGE_CACHE_CHANGED_EVENT, onChange);
    window.removeEventListener(PROFILE_DATA_STALE_EVENT, onChange);
    window.removeEventListener(TRAVEL_STATE_UPDATED_EVENT, onChange);
  };
}

/** Hydration-safe profile cache read: null on server, localStorage after hydrate. */
export function useCachedProfile(username: string): PublicProfilePageData | null {
  const normalized = username.trim().toLowerCase();
  const getSnapshot = useCallback(
    () => readProfileCache(normalized),
    [normalized]
  );
  return useSyncExternalStore(subscribePageCache, getSnapshot, () => null);
}

/** Hydration-safe settings cache read. */
export function useCachedSettings(): CachedSettingsPayload | null {
  return useSyncExternalStore(subscribePageCache, readSettingsCache, () => null);
}
