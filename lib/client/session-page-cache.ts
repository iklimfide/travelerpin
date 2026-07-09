import type { ProfileSettingsRow } from "@/lib/supabase/profile-settings";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";
import type { TravelStats } from "@/types/database";

const CACHE_VERSION = 1;
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

export function invalidateOwnProfileCache(): void {
  const username = getOwnUsername();
  if (username) invalidateProfileCache(username);
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
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(HOME_CACHE_KEY);
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
