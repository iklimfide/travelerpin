"use client";

import { Suspense } from "react";
import { ProfileFollowButton } from "@/components/profile/ProfileFollowButton";
import { ProfileFollowStats } from "@/components/profile/ProfileFollowStats";

type ProfileActionButtonsProps = {
  username: string;
  displayName: string;
  isOwnProfile: boolean;
  followUsername?: string;
  followState?: {
    isFollowing: boolean;
    followerCount: number;
    followingCount: number;
  } | null;
  canFollow?: boolean;
  isLoggedIn?: boolean;
};

export function ProfileActionButtons({
  username,
  displayName,
  followUsername,
  followState,
  canFollow = false,
  isLoggedIn = false,
}: ProfileActionButtonsProps) {
  const showFollow = Boolean(followUsername && followState);
  const showStats = Boolean(followState);
  const statsUsername = showFollow ? followUsername! : username;

  if (!showFollow && !showStats) return null;

  return (
    <>
      {showStats ? (
        <div className="absolute top-[14px] left-[14px] z-10 max-w-[min(40%,10rem)] rounded-2xl bg-[#e8eef5] px-2.5 py-1.5 shadow-sm [&_.profile-follow-count--compact]:!text-left">
          <ProfileFollowStats
            username={statsUsername}
            displayName={displayName}
            followerCount={followState!.followerCount}
            followingCount={followState!.followingCount}
            className="profile-follow-stats--compact !items-start"
          />
        </div>
      ) : null}

      {showFollow ? (
        <div className="profile-actions z-10 !top-[3.25rem]">
          <div className="profile-actions__end ml-auto">
            <Suspense fallback={null}>
              <ProfileFollowButton
                username={followUsername!}
                displayName={displayName}
                initialFollowing={followState!.isFollowing}
                initialFollowerCount={followState!.followerCount}
                initialFollowingCount={followState!.followingCount}
                canFollow={canFollow}
                isLoggedIn={isLoggedIn}
                variant="actionBar"
                showStats={false}
              />
            </Suspense>
          </div>
        </div>
      ) : null}
    </>
  );
}
