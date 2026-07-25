/**
 * Session-scoped YP admin cache.
 * Survives client navigations between /kamikaze/* tabs without refetching
 * unchanged data. Cleared on browser-tab close (sessionStorage) and on mutations.
 */

const MEMORY = new Map<string, unknown>();
const STORAGE_PREFIX = "yp:cache:";

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function ypCacheGet<T>(key: string): T | null {
  if (MEMORY.has(key)) {
    return MEMORY.get(key) as T;
  }
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    MEMORY.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function ypCacheSet(key: string, value: unknown): void {
  MEMORY.set(key, value);
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

/** Invalidate all keys, or those whose logical key starts with `prefix`. */
export function ypCacheInvalidate(prefix?: string): void {
  if (!prefix) {
    MEMORY.clear();
    if (typeof window === "undefined") return;
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(STORAGE_PREFIX)) toRemove.push(k);
      }
      for (const k of toRemove) sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
    return;
  }

  for (const key of [...MEMORY.keys()]) {
    if (key.startsWith(prefix)) MEMORY.delete(key);
  }

  if (typeof window === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k?.startsWith(STORAGE_PREFIX)) continue;
      const logical = k.slice(STORAGE_PREFIX.length);
      if (logical.startsWith(prefix)) toRemove.push(k);
    }
    for (const k of toRemove) sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

export const YP_CACHE_KEYS = {
  // Bump catalog version when list row shape / pagination changes.
  catalog: (
    kind: string,
    scope: string,
    country: string,
    q: string,
    popularFilter = ""
  ) => `catalog:v6:${kind}:${scope}:${country}:${q.trim().toLowerCase()}:${popularFilter}`,
  catalogAdditions: (kind: string) => `catalog:additions:v3:${kind}`,
  users: (query: string) => `users:v2:${query.trim().toLowerCase()}`,
  stats: "stats",
  notifications: "notifications",
  kamikazeCityHeroImages: "hero:kamikaze:city:v1",
  kamikazeParkHeroImages: "hero:kamikaze:park:v1",
} as const;
