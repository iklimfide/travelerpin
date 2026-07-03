"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuthGate } from "@/components/auth/useAuthGate";
import { ProfileFollowStats } from "@/components/profile/ProfileFollowStats";
import { followProfile, unfollowProfile } from "@/lib/client/follow-actions";
import { profileMessages } from "@/lib/i18n/client-messages";

type ProfileFollowButtonProps = {
  username: string;
  displayName: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
  initialFollowingCount: number;
  canFollow: boolean;
  isLoggedIn: boolean;
  variant?: "default" | "actionBar";
};

export function ProfileFollowButton({
  username,
  displayName,
  initialFollowing,
  initialFollowerCount,
  initialFollowingCount,
  canFollow,
  isLoggedIn,
  variant = "default",
}: ProfileFollowButtonProps) {
  const router = useRouter();
  const { requireLogin } = useAuthGate();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followingCount] = useState(initialFollowingCount);
  const [pending, startTransition] = useTransition();
  const isActionBar = variant === "actionBar";

  function toggleFollow() {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }

    startTransition(async () => {
      const result = isFollowing
        ? await unfollowProfile(username)
        : await followProfile(username);

      if (!result.ok) return;

      setIsFollowing(result.following);
      setFollowerCount(result.followerCount);
      router.refresh();
    });
  }

  const statsClass = isActionBar ? "profile-follow-stats--compact" : "";

  if (!canFollow && !isLoggedIn) {
    if (isActionBar) {
      return (
        <div className="profile-actions-follow">
          <button
            type="button"
            className="profile-follow-btn profile-follow-btn--compact"
            onClick={requireLogin}
          >
            {profileMessages.follow}
          </button>
          <ProfileFollowStats
            username={username}
            displayName={displayName}
            followerCount={followerCount}
            followingCount={followingCount}
            className={statsClass}
          />
        </div>
      );
    }

    return (
      <div className="profile-follow-row">
        <p className="profile-follow-hint">{profileMessages.followToSeePins}</p>
        <ProfileFollowStats
          username={username}
          displayName={displayName}
          followerCount={followerCount}
          followingCount={followingCount}
        />
      </div>
    );
  }

  if (!canFollow) {
    if (!isActionBar || (followerCount <= 0 && followingCount <= 0)) return null;

    return (
      <ProfileFollowStats
        username={username}
        displayName={displayName}
        followerCount={followerCount}
        followingCount={followingCount}
        className={`${statsClass} profile-follow-stats--solo`}
      />
    );
  }

  const rowClass = isActionBar ? "profile-actions-follow" : "profile-follow-row";
  const btnClass = `profile-follow-btn${isFollowing ? " profile-follow-btn--following" : ""}${
    isActionBar ? " profile-follow-btn--compact" : ""
  }`;

  return (
    <div className={rowClass}>
      <button
        type="button"
        className={btnClass}
        onClick={toggleFollow}
        disabled={pending}
        aria-pressed={isFollowing}
      >
        {isFollowing ? profileMessages.following : profileMessages.follow}
      </button>
      <ProfileFollowStats
        username={username}
        displayName={displayName}
        followerCount={followerCount}
        followingCount={followingCount}
        className={statsClass}
      />
    </div>
  );
}
