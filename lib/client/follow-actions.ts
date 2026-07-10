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
  followersCache.delete(username.toLowerCase());
  return {
    ok: true,
    following: true,
    followerCount: (data.followerCount as number) ?? 0,
    followingCount: (data.followingCount as number) ?? 0,
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
  followersCache.delete(username.toLowerCase());
  return {
    ok: true,
    following: false,
    followerCount: (data.followerCount as number) ?? 0,
    followingCount: (data.followingCount as number) ?? 0,
  };
}

export function fetchProfileFollowers(username: string): Promise<FollowersResult> {
  const key = username.toLowerCase();
  if (isDemoProfileUsername(key)) {
    return Promise.resolve({ ok: true, followers: [], demo: true });
  }

  const cached = followersCache.get(key);
  if (cached) return cached;

  const request = fetch(`/api/follows/${encodeURIComponent(username)}/followers`)
    .then(async (res): Promise<FollowersResult> => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: (data.error as string) ?? "Failed to load followers" };
      }
      return {
        ok: true,
        followers: (data.followers as ProfileFollowerSummary[]) ?? [],
        demo: data.demo === true,
      };
    })
    .catch((): FollowersResult => ({ ok: false, error: "Failed to load followers" }));

  followersCache.set(key, request);
  return request;
}

export function fetchProfileFollowing(username: string): Promise<FollowingResult> {
  const key = username.toLowerCase();
  if (isDemoProfileUsername(key)) {
    return Promise.resolve({ ok: true, following: [], demo: true });
  }

  const cached = followingCache.get(key);
  if (cached) return cached;

  const request = fetch(`/api/follows/${encodeURIComponent(username)}/following`)
    .then(async (res): Promise<FollowingResult> => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: (data.error as string) ?? "Failed to load following" };
      }
      return {
        ok: true,
        following: (data.following as ProfileFollowerSummary[]) ?? [],
        demo: data.demo === true,
      };
    })
    .catch((): FollowingResult => ({ ok: false, error: "Failed to load following" }));

  followingCache.set(key, request);
  return request;
}
