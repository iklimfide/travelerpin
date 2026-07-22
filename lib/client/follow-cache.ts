import type { ProfileFollowerSummary, ProfileFollowListType } from "@/types/database";

const CACHE_VERSION = 1;
const STORAGE_PREFIX = `tp:v${CACHE_VERSION}:follow:`;

type FollowStateSnapshot = {
  v: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
};

type FollowListSnapshot = {
  v: number;
  members: ProfileFollowerSummary[];
  demo?: boolean;
};

const memoryFollowState = new Map<string, FollowStateSnapshot>();
const memoryFollowLists = new Map<string, FollowListSnapshot>();

function followStateKey(username: string): string {
  return `${STORAGE_PREFIX}state:${username.trim().toLowerCase()}`;
}

function followListKey(username: string, listType: ProfileFollowListType): string {
  return `${STORAGE_PREFIX}list:${listType}:${username.trim().toLowerCase()}`;
}

function readSessionJson<T extends { v: number }>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    if (parsed.v !== CACHE_VERSION) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionJson(key: string, value: object): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ v: CACHE_VERSION, ...value }));
  } catch {
    // Private mode / quota — memory copy still helps this navigation.
  }
}

function removeSessionKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function readFollowStateCache(
  username: string
): Omit<FollowStateSnapshot, "v"> | null {
  const key = username.trim().toLowerCase();
  const mem = memoryFollowState.get(key);
  if (mem) {
    const { v: _v, ...rest } = mem;
    return rest;
  }

  const stored = readSessionJson<FollowStateSnapshot>(followStateKey(key));
  if (!stored) return null;
  memoryFollowState.set(key, stored);
  const { v: _v, ...rest } = stored;
  return rest;
}

export function writeFollowStateCache(
  username: string,
  state: Omit<FollowStateSnapshot, "v">
): void {
  const key = username.trim().toLowerCase();
  const snapshot: FollowStateSnapshot = { v: CACHE_VERSION, ...state };
  memoryFollowState.set(key, snapshot);
  writeSessionJson(followStateKey(key), snapshot);
}

export function readFollowListCache(
  username: string,
  listType: ProfileFollowListType
): { members: ProfileFollowerSummary[]; demo?: boolean } | null {
  const userKey = username.trim().toLowerCase();
  const memKey = `${listType}:${userKey}`;
  const mem = memoryFollowLists.get(memKey);
  if (mem) {
    return { members: mem.members, demo: mem.demo };
  }

  const stored = readSessionJson<FollowListSnapshot>(followListKey(userKey, listType));
  if (!stored) return null;
  memoryFollowLists.set(memKey, stored);
  return { members: stored.members, demo: stored.demo };
}

export function writeFollowListCache(
  username: string,
  listType: ProfileFollowListType,
  members: ProfileFollowerSummary[],
  demo = false
): void {
  const userKey = username.trim().toLowerCase();
  const memKey = `${listType}:${userKey}`;
  const snapshot: FollowListSnapshot = { v: CACHE_VERSION, members, demo };
  memoryFollowLists.set(memKey, snapshot);
  writeSessionJson(followListKey(userKey, listType), snapshot);
}

/** Drop cached lists for a profile (after follow/unfollow or list mutation). */
export function invalidateFollowListCache(username: string): void {
  const userKey = username.trim().toLowerCase();
  for (const listType of ["followers", "following"] as const) {
    memoryFollowLists.delete(`${listType}:${userKey}`);
    removeSessionKey(followListKey(userKey, listType));
  }
}
