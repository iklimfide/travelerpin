import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileFollowState, ProfileFollowerSummary } from "@/types/database";
import { profilePath } from "@/lib/seo/site";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";

export async function getProfileIdByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  return data?.id ?? null;
}

export async function loadProfileFollowCounts(
  supabase: SupabaseClient,
  profileId: string
): Promise<{ followerCount: number; followingCount: number }> {
  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase
      .from("profile_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profileId),
    supabase
      .from("profile_follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", profileId),
  ]);

  return {
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
  };
}

export async function isFollowingProfile(
  supabase: SupabaseClient,
  followerId: string,
  followingId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profile_follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  return Boolean(data);
}

export async function loadProfileFollowState(
  supabase: SupabaseClient,
  profileId: string,
  viewerId: string | null
): Promise<ProfileFollowState> {
  const counts = await loadProfileFollowCounts(supabase, profileId);
  const isFollowing =
    viewerId != null ? await isFollowingProfile(supabase, viewerId, profileId) : false;

  return {
    isFollowing,
    followerCount: counts.followerCount,
    followingCount: counts.followingCount,
  };
}

export async function followProfile(
  supabase: SupabaseClient,
  followingId: string
): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("follow_profile", {
    p_following_id: followingId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, created: data === true };
}

export async function unfollowProfile(
  supabase: SupabaseClient,
  followingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("unfollow_profile", {
    p_following_id: followingId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

type FollowerProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type ProfileFollowerRow = {
  created_at: string;
  profiles: FollowerProfile | FollowerProfile[] | null;
};

function resolveFollowerProfile(profiles: ProfileFollowerRow["profiles"]): FollowerProfile | null {
  if (profiles == null) return null;
  if (Array.isArray(profiles)) return profiles[0] ?? null;
  return profiles;
}

export async function loadProfileFollowers(
  supabase: SupabaseClient,
  profileId: string,
  limit = 50
): Promise<ProfileFollowerSummary[]> {
  const { data, error } = await supabase
    .from("profile_follows")
    .select("created_at, profiles!follower_id(username, display_name, avatar_url)")
    .eq("following_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("loadProfileFollowers failed:", error.message);
    return [];
  }

  return ((data as ProfileFollowerRow[] | null) ?? [])
    .map((row) => {
      const profile = resolveFollowerProfile(row.profiles);
      if (!profile?.username) return null;

      const username = profile.username;
      return {
        username,
        displayName: resolveProfileDisplayName(profile.display_name, username),
        avatarUrl: profile.avatar_url,
        followedAt: row.created_at,
        profilePath: profilePath(username),
      };
    })
    .filter((row): row is ProfileFollowerSummary => row != null);
}

type ProfileFollowingRow = {
  created_at: string;
  profiles: FollowerProfile | FollowerProfile[] | null;
};

export async function loadProfileFollowing(
  supabase: SupabaseClient,
  profileId: string,
  limit = 50
): Promise<ProfileFollowerSummary[]> {
  const { data, error } = await supabase
    .from("profile_follows")
    .select("created_at, profiles!following_id(username, display_name, avatar_url)")
    .eq("follower_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("loadProfileFollowing failed:", error.message);
    return [];
  }

  return ((data as ProfileFollowingRow[] | null) ?? [])
    .map((row) => {
      const profile = resolveFollowerProfile(row.profiles);
      if (!profile?.username) return null;

      const username = profile.username;
      return {
        username,
        displayName: resolveProfileDisplayName(profile.display_name, username),
        avatarUrl: profile.avatar_url,
        followedAt: row.created_at,
        profilePath: profilePath(username),
      };
    })
    .filter((row): row is ProfileFollowerSummary => row != null);
}
