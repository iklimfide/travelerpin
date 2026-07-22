import {
  invalidateFollowListCache,
  readFollowListCache,
  writeFollowListCache,
  writeFollowStateCache,
} from "@/lib/client/follow-cache";
import { isDemoProfileUsername } from "@/lib/data/demo-profile-username";
import type { ProfileFollowerSummary } from "@/types/database";

type FollowersResult =
  | { ok: true; followers: ProfileFollowerSummary[]; demo?: boolean }
  | { ok: false; error: string };

type FollowingResult =
  | { ok: true; following: ProfileFollowerSummary[]; demo?: boolean }
  | { ok: false; error: string };

const followersCache = new Map<string, Promise<FollowersResult>>();
const followingCache = new Map<string, Promise<FollowingResult>>();

function resolveFollowers(username: string): Promise<FollowersResult> {
  const key = username.toLowerCase();
  const sessionCached = readFollowListCache(key, "followers");
  if (sessionCached) {
    return Promise.resolve({
      ok: true,
      followers: sessionCached.members,
      demo: sessionCached.demo,
    });
  }

  const request = fetch(`/api/follows/${encodeURIComponent(username)}/followers`)
    .then(async (res): Promise<FollowersResult> => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        followersCache.delete(key);
        return { ok: false, error: (data.error as string) ?? "Failed to load followers" };
      }
      const followers = (data.followers as ProfileFollowerSummary[]) ?? [];
      writeFollowListCache(key, "followers", followers, data.demo === true);
      return {
        ok: true,
        followers,
        demo: data.demo === true,
      };
    })
    .catch((): FollowersResult => {
      followersCache.delete(key);
      return { ok: false, error: "Failed to load followers" };
    });

  followersCache.set(key, request);
  return request;
}

function resolveFollowing(username: string): Promise<FollowingResult> {
  const key = username.toLowerCase();
  const sessionCached = readFollowListCache(key, "following");
  if (sessionCached) {
    return Promise.resolve({
      ok: true,
      following: sessionCached.members,
      demo: sessionCached.demo,
    });
  }

  const request = fetch(`/api/follows/${encodeURIComponent(username)}/following`)
    .then(async (res): Promise<FollowingResult> => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        followingCache.delete(key);
        return { ok: false, error: (data.error as string) ?? "Failed to load following" };
      }
      const following = (data.following as ProfileFollowerSummary[]) ?? [];
      writeFollowListCache(key, "following", following, data.demo === true);
      return {
        ok: true,
        following,
        demo: data.demo === true,
      };
    })
    .catch((): FollowingResult => {
      followingCache.delete(key);
      return { ok: false, error: "Failed to load following" };
    });

  followingCache.set(key, request);
  return request;
}

export async function followProfile(username: string): Promise<
  | { ok: true; following: boolean; followerCount: number; followingCount: number }
  | { ok: false; error: string }
> {
  const res = await fetch(`/api/follows/${encodeURIComponent(username)}`, {
    method: "POST",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: (data.error as string) ?? "Failed to follow" };
  }

  const key = username.toLowerCase();
  followersCache.delete(key);
  followingCache.delete(key);
  invalidateFollowListCache(key);

  const followerCount = (data.followerCount as number) ?? 0;
  const followingCount = (data.followingCount as number) ?? 0;
  writeFollowStateCache(key, {
    isFollowing: true,
    followerCount,
    followingCount,
  });

  return {
    ok: true,
    following: true,
    followerCount,
    followingCount,
  };
}

export async function unfollowProfile(username: string): Promise<
  | { ok: true; following: boolean; followerCount: number; followingCount: number }
  | { ok: false; error: string }
> {
  const res = await fetch(`/api/follows/${encodeURIComponent(username)}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: (data.error as string) ?? "Failed to unfollow" };
  }

  const key = username.toLowerCase();
  followersCache.delete(key);
  followingCache.delete(key);
  invalidateFollowListCache(key);

  const followerCount = (data.followerCount as number) ?? 0;
  const followingCount = (data.followingCount as number) ?? 0;
  writeFollowStateCache(key, {
    isFollowing: false,
    followerCount,
    followingCount,
  });

  return {
    ok: true,
    following: false,
    followerCount,
    followingCount,
  };
}

export function fetchProfileFollowers(username: string): Promise<FollowersResult> {
  const key = username.toLowerCase();
  if (isDemoProfileUsername(key)) {
    return Promise.resolve({ ok: true, followers: [], demo: true });
  }

  const cached = followersCache.get(key);
  if (cached) return cached;

  return resolveFollowers(username);
}

export function fetchProfileFollowing(username: string): Promise<FollowingResult> {
  const key = username.toLowerCase();
  if (isDemoProfileUsername(key)) {
    return Promise.resolve({ ok: true, following: [], demo: true });
  }

  const cached = followingCache.get(key);
  if (cached) return cached;

  return resolveFollowing(username);
}

/** Warm session cache after profile page-data loads (counts visible, lists not yet opened). */
export function prefetchProfileFollowLists(
  username: string,
  followerCount: number,
  followingCount: number
): void {
  const key = username.toLowerCase();
  if (isDemoProfileUsername(key)) return;

  if (followerCount > 0 && !readFollowListCache(key, "followers")) {
    void fetchProfileFollowers(key);
  }
  if (followingCount > 0 && !readFollowListCache(key, "following")) {
    void fetchProfileFollowing(key);
  }
}
