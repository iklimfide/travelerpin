import type { ProfileSettingsRow } from "@/lib/supabase/profile-settings";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";
import type { NextRouteStop, TravelStats, VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";
import { parseNextRoute } from "@/lib/utils/next-route";

export type TravelStateData = {
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  wishlistCountries: WishlistCountry[];
  stats: TravelStats;
  visitedCodes: string[];
};

type CachedTravelStatePayload = {
  v: number;
  data: TravelStateData;
};

const CACHE_VERSION = 2;
const OWN_USERNAME_KEY = "tp:own-username";

export type CachedProfilePayload = {
  v: number;
  username: string;
  data: PublicProfilePageData;
};

export type CachedSettingsPayload = {
  v: number;
  profile: ProfileSettingsRow;
  stats: TravelStats;
};

function profileCacheKey(username: string): string {
  return `tp:v${CACHE_VERSION}:profile:${username.trim().toLowerCase()}`;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T & { v?: number };
    if (parsed.v !== CACHE_VERSION) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: object): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ v: CACHE_VERSION, ...value }));
  } catch {
    // Private mode / quota — ignore.
  }
}

export function setOwnUsername(username: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!username) {
      sessionStorage.removeItem(OWN_USERNAME_KEY);
      return;
    }
    sessionStorage.setItem(OWN_USERNAME_KEY, username.toLowerCase());
  } catch {
    // ignore
  }
}

export function getOwnUsername(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(OWN_USERNAME_KEY);
  } catch {
    return null;
  }
}

export function readProfileCache(username: string): PublicProfilePageData | null {
  const payload = readJson<CachedProfilePayload>(profileCacheKey(username));
  if (!payload || payload.username !== username.trim().toLowerCase()) return null;
  return payload.data;
}

export function writeProfileCache(username: string, data: PublicProfilePageData): void {
  writeJson(profileCacheKey(username), {
    username: username.trim().toLowerCase(),
    data,
  });
}

export function invalidateProfileCache(username: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(profileCacheKey(username));
  } catch {
    // ignore
  }
}

export const PROFILE_DATA_STALE_EVENT = "tp:profile-data-stale";
export const NEXT_ROUTE_CHANGED_EVENT = "tp:next-route-changed";
export const TRAVEL_STATE_UPDATED_EVENT = "tp:travel-state-updated";

export type ProfileDataStaleDetail = {
  username?: string;
  removeCityId?: string;
  removeParkId?: string;
};

/** Merge travel-state pins into the own-profile session cache (map ↔ My cities sync). */
export function syncOwnProfileCacheFromTravelState(data: TravelStateData): void {
  const username = getOwnUsername();
  if (!username) return;

  const cached = readProfileCache(username);
  if (!cached) return;

  writeProfileCache(username, {
    ...cached,
    visitedCountries: data.visitedCountries,
    visitedCities: data.visitedCities,
    visitedParks: data.visitedParks,
    wishlistCountries: data.wishlistCountries,
    visitedCodes: data.visitedCodes,
    stats: data.stats,
  });
}

const OWN_TRAVEL_STATE_CACHE_KEY = `tp:v${CACHE_VERSION}:own-travel-state`;

const OWN_NEXT_ROUTE_CACHE_KEY = `tp:v${CACHE_VERSION}:own-next-route`;

export function readOwnNextRouteCache(): NextRouteStop[] | null {
  const payload = readJson<{ stops: unknown }>(OWN_NEXT_ROUTE_CACHE_KEY);
  if (!payload) return null;
  return parseNextRoute(payload.stops);
}

export function writeOwnNextRouteCache(stops: NextRouteStop[]): void {
  writeJson(OWN_NEXT_ROUTE_CACHE_KEY, { stops });
}

export function patchOwnProfileNextRoute(stops: NextRouteStop[]): void {
  const username = getOwnUsername();
  if (!username) return;

  const cached = readProfileCache(username);
  if (!cached) return;

  writeProfileCache(username, {
    ...cached,
    profile: {
      ...cached.profile,
      next_route: stops,
    },
  });
}

export function notifyNextRouteChanged(stops: NextRouteStop[]): void {
  writeOwnNextRouteCache(stops);
  patchOwnProfileNextRoute(stops);

  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NEXT_ROUTE_CHANGED_EVENT, {
      detail: { stops },
    })
  );
}

/** Bust profile session cache and ask mounted profile views to refetch. */
export function notifyProfileDataChanged(
  username?: string | null,
  options?: { removeCityId?: string; removeParkId?: string }
): void {
  const normalized = username?.trim().toLowerCase() ?? getOwnUsername() ?? undefined;

  if (normalized) {
    invalidateProfileCache(normalized);
  }

  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PROFILE_DATA_STALE_EVENT, {
      detail: {
        username: normalized,
        removeCityId: options?.removeCityId,
        removeParkId: options?.removeParkId,
      } satisfies ProfileDataStaleDetail,
    })
  );
}

export function readTravelStateCache(): TravelStateData | null {
  const payload = readJson<CachedTravelStatePayload>(OWN_TRAVEL_STATE_CACHE_KEY);
  return payload?.data ?? null;
}

export function writeTravelStateCache(data: TravelStateData): void {
  writeJson(OWN_TRAVEL_STATE_CACHE_KEY, { data });
}

export function invalidateTravelStateCache(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(OWN_TRAVEL_STATE_CACHE_KEY);
  } catch {
    // ignore
  }
}

export function notifyTravelStateUpdated(data: TravelStateData): void {
  writeTravelStateCache(data);
  syncOwnProfileCacheFromTravelState(data);

  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TRAVEL_STATE_UPDATED_EVENT, {
      detail: { data },
    })
  );
}

export function invalidateOwnProfileCache(): void {
  notifyProfileDataChanged();
}

const SETTINGS_CACHE_KEY = `tp:v${CACHE_VERSION}:settings`;

export function readSettingsCache(): CachedSettingsPayload | null {
  const payload = readJson<CachedSettingsPayload>(SETTINGS_CACHE_KEY);
  if (!payload?.profile) return null;
  return payload;
}

export function writeSettingsCache(payload: Omit<CachedSettingsPayload, "v">): void {
  writeJson(SETTINGS_CACHE_KEY, payload);
}

export function invalidateSettingsCache(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SETTINGS_CACHE_KEY);
  } catch {
    // ignore
  }
}

const HOME_CACHE_KEY = `tp:v${CACHE_VERSION}:home`;

export function readHomeCache(): PublicProfilePageData | null {
  const payload = readJson<{ data: PublicProfilePageData }>(HOME_CACHE_KEY);
  return payload?.data ?? null;
}

export function writeHomeCache(data: PublicProfilePageData): void {
  writeJson(HOME_CACHE_KEY, { data });
}

export function clearAllSessionPageCaches(): void {
  invalidateSettingsCache();
  invalidateTravelStateCache();
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(HOME_CACHE_KEY);
    sessionStorage.removeItem(OWN_NEXT_ROUTE_CACHE_KEY);
  } catch {
    // ignore
  }
  const username = getOwnUsername();
  if (username) invalidateProfileCache(username);
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(OWN_USERNAME_KEY);
  } catch {
    // ignore
  }
}
