import type { ProfileSettingsRow } from "@/lib/supabase/profile-settings";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-types";
import type {
  NextRoutePayload,
  TravelStats,
  VisitedCity,
  VisitedCountry,
  VisitedPark,
  WishlistCountry,
} from "@/types/database";
import { parseNextRoutePayload } from "@/lib/utils/next-route";

export type TravelStateData = {
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  wishlistCountries: WishlistCountry[];
  stats: TravelStats;
  visitedCodes: string[];
};

/** Bump when payload shape changes. Persists in localStorage until pin/settings/logout. */
const CACHE_VERSION = 5;
const OWN_USERNAME_KEY = "tp:own-username";
const OWN_USER_ID_KEY = "tp:own-user-id";
const OWN_AVATAR_URL_KEY = "tp:own-avatar-url";
const OWN_DISPLAY_NAME_KEY = "tp:own-display-name";

/** Sentinel stored when the profile is known to have no avatar. */
const NO_AVATAR_SENTINEL = "";

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

export type CachedHomePayload = {
  v: number;
  isLoggedIn: boolean;
};

function profileCacheKey(username: string): string {
  return `tp:v${CACHE_VERSION}:profile:${username.trim().toLowerCase()}`;
}

function travelStateCacheKey(userId: string): string {
  return `tp:v${CACHE_VERSION}:travel:${userId}`;
}

function nextRouteCacheKey(userId: string): string {
  return `tp:v${CACHE_VERSION}:next-route:${userId}`;
}

function settingsCacheKey(userId: string): string {
  return `tp:v${CACHE_VERSION}:settings:${userId}`;
}

const HOME_CACHE_KEY = `tp:v${CACHE_VERSION}:home`;

/** Fired when any page cache entry is written/removed (for useSyncExternalStore). */
export const PAGE_CACHE_CHANGED_EVENT = "tp:page-cache-changed";

const memoryStore = new Map<string, unknown>();

function notifyPageCacheChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PAGE_CACHE_CHANGED_EVENT));
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  if (memoryStore.has(key)) {
    return memoryStore.get(key) as T;
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T & { v?: number };
    if (parsed.v !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }
    memoryStore.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: object): void {
  if (typeof window === "undefined") return;
  const payload = { v: CACHE_VERSION, ...value };
  memoryStore.set(key, payload);
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Private mode / quota — keep memory copy.
  }
  notifyPageCacheChanged();
}

function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  memoryStore.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  notifyPageCacheChanged();
}

export function setOwnUserId(userId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!userId) {
      localStorage.removeItem(OWN_USER_ID_KEY);
      return;
    }
    localStorage.setItem(OWN_USER_ID_KEY, userId);
  } catch {
    // ignore
  }
}

export function getOwnUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(OWN_USER_ID_KEY);
  } catch {
    return null;
  }
}

export function setOwnUsername(username: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!username) {
      localStorage.removeItem(OWN_USERNAME_KEY);
      return;
    }
    localStorage.setItem(OWN_USERNAME_KEY, username.toLowerCase());
  } catch {
    // ignore
  }
}

export function getOwnUsername(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(OWN_USERNAME_KEY);
  } catch {
    return null;
  }
}

/** Pass `null` when the profile is known to have no avatar; use clearOwnIdentityExtras on logout. */
export function setOwnAvatarUrl(avatarUrl: string | null): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OWN_AVATAR_URL_KEY, avatarUrl ?? NO_AVATAR_SENTINEL);
  } catch {
    // ignore
  }
}

/**
 * `undefined` = not cached yet (avatar unknown, keep skeleton),
 * `null` = known to have no avatar, string = avatar URL.
 */
export function getOwnAvatarUrl(): string | null | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(OWN_AVATAR_URL_KEY);
    if (raw === null) return undefined;
    return raw === NO_AVATAR_SENTINEL ? null : raw;
  } catch {
    return undefined;
  }
}

export function setOwnDisplayName(displayName: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!displayName) {
      localStorage.removeItem(OWN_DISPLAY_NAME_KEY);
      return;
    }
    localStorage.setItem(OWN_DISPLAY_NAME_KEY, displayName);
  } catch {
    // ignore
  }
}

export function getOwnDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(OWN_DISPLAY_NAME_KEY);
  } catch {
    return null;
  }
}

export function clearOwnIdentityExtras(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(OWN_AVATAR_URL_KEY);
    localStorage.removeItem(OWN_DISPLAY_NAME_KEY);
  } catch {
    // ignore
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
  removeKey(profileCacheKey(username));
}

export const PROFILE_DATA_STALE_EVENT = "tp:profile-data-stale";
export const NEXT_ROUTE_CHANGED_EVENT = "tp:next-route-changed";
export const TRAVEL_STATE_UPDATED_EVENT = "tp:travel-state-updated";

export type ProfileDataStaleDetail = {
  username?: string;
  removeCityId?: string;
  removeCityIds?: string[];
  removeParkId?: string;
  removeParkIds?: string[];
};

/** Merge travel-state pins into the own-profile page cache (map ↔ My cities sync). */
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

export function readOwnNextRouteCache(): NextRoutePayload | null {
  const userId = getOwnUserId();
  if (!userId) return null;
  const payload = readJson<unknown>(nextRouteCacheKey(userId));
  if (!payload) return null;
  return parseNextRoutePayload(payload);
}

export function writeOwnNextRouteCache(route: NextRoutePayload): void {
  const userId = getOwnUserId();
  if (!userId) return;
  writeJson(nextRouteCacheKey(userId), route);
}

export function patchOwnProfileNextRoute(route: NextRoutePayload): void {
  const username = getOwnUsername();
  if (!username) return;

  const cached = readProfileCache(username);
  if (!cached) return;

  writeProfileCache(username, {
    ...cached,
    profile: {
      ...cached.profile,
      next_route: route.stops,
      next_route_total_days: route.totalDays,
      next_route_transport: route.transport,
    },
  });
}

export function notifyNextRouteChanged(route: NextRoutePayload): void {
  writeOwnNextRouteCache(route);
  patchOwnProfileNextRoute(route);

  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NEXT_ROUTE_CHANGED_EVENT, {
      detail: route,
    })
  );
}

/** Bust profile page cache and ask mounted profile views to refetch. */
export function notifyProfileDataChanged(
  username?: string | null,
  options?: {
    removeCityId?: string;
    removeCityIds?: string[];
    removeParkId?: string;
    removeParkIds?: string[];
  }
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
        removeCityIds: options?.removeCityIds,
        removeParkId: options?.removeParkId,
        removeParkIds: options?.removeParkIds,
      } satisfies ProfileDataStaleDetail,
    })
  );
}

export function readTravelStateCache(): TravelStateData | null {
  const userId = getOwnUserId();
  if (!userId) return null;
  const payload = readJson<{ data: TravelStateData }>(travelStateCacheKey(userId));
  return payload?.data ?? null;
}

export function writeTravelStateCache(data: TravelStateData): void {
  const userId = getOwnUserId();
  if (!userId) return;
  writeJson(travelStateCacheKey(userId), { data });
}

export function invalidateTravelStateCache(): void {
  const userId = getOwnUserId();
  if (!userId) return;
  removeKey(travelStateCacheKey(userId));
}

export function notifyTravelStateUpdated(data: TravelStateData): void {
  hydrateTravelStateCache(data);

  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TRAVEL_STATE_UPDATED_EVENT, {
      detail: { data },
    })
  );
}

/** Update caches without broadcasting — used for login prefetch / background sync. */
export function hydrateTravelStateCache(data: TravelStateData): void {
  writeTravelStateCache(data);
  syncOwnProfileCacheFromTravelState(data);
}

export function invalidateOwnProfileCache(): void {
  notifyProfileDataChanged();
}

export function readSettingsCache(): CachedSettingsPayload | null {
  const userId = getOwnUserId();
  if (!userId) return null;
  const payload = readJson<CachedSettingsPayload>(settingsCacheKey(userId));
  if (!payload?.profile) return null;
  return payload;
}

export function writeSettingsCache(payload: Omit<CachedSettingsPayload, "v">): void {
  const userId = getOwnUserId();
  if (!userId) return;
  writeJson(settingsCacheKey(userId), payload);
}

export function invalidateSettingsCache(): void {
  const userId = getOwnUserId();
  if (!userId) return;
  removeKey(settingsCacheKey(userId));
}

/** Home cache only stores auth flag; Jennifer demo map is rebuilt from static code. */
export function readHomeCache(): CachedHomePayload | null {
  const payload = readJson<CachedHomePayload>(HOME_CACHE_KEY);
  if (!payload || typeof payload.isLoggedIn !== "boolean") return null;
  return payload;
}

export function writeHomeCache(isLoggedIn: boolean): void {
  writeJson(HOME_CACHE_KEY, { isLoggedIn });
}

/** Clear own page caches on logout. Home auth flag is reset to guest. */
export function clearAllSessionPageCaches(): void {
  const userId = getOwnUserId();
  const username = getOwnUsername();

  if (userId) {
    removeKey(travelStateCacheKey(userId));
    removeKey(nextRouteCacheKey(userId));
    removeKey(settingsCacheKey(userId));
  }
  if (username) invalidateProfileCache(username);

  writeHomeCache(false);
  setOwnUserId(null);
  setOwnUsername(null);
  clearOwnIdentityExtras();
}
