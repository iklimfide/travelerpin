"use client";

import { Suspense, useEffect, useState } from "react";
import { ProfileFollowButton } from "@/components/profile/ProfileFollowButton";
import { ProfileFollowStats } from "@/components/profile/ProfileFollowStats";
import { readFollowStateCache, writeFollowStateCache } from "@/lib/client/follow-cache";
import { readProfileCache } from "@/lib/client/session-page-cache";

type FollowState = {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
};

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
  /** When set (home demo card), follow counts link to the profile instead of opening modals. */
  profileHref?: string;
};

export function ProfileActionButtons({
  username,
  displayName,
  followUsername,
  followState: followStateProp,
  canFollow = false,
  isLoggedIn = false,
  profileHref,
}: ProfileActionButtonsProps) {
  const [cachedFollowState, setCachedFollowState] = useState<FollowState | null>(null);

  useEffect(() => {
    const fromSession = readFollowStateCache(username);
    if (fromSession) {
      setCachedFollowState(fromSession);
      return;
    }

    const fromProfile = readProfileCache(username)?.followState;
    if (fromProfile) {
      writeFollowStateCache(username, fromProfile);
      setCachedFollowState(fromProfile);
    }
  }, [username]);

  useEffect(() => {
    if (!followStateProp) return;
    writeFollowStateCache(username, followStateProp);
    setCachedFollowState(followStateProp);
  }, [followStateProp, username]);

  const followState = followStateProp ?? cachedFollowState;
  const showFollow = Boolean(followUsername && followState);
  const showStats = Boolean(followState);
  const statsUsername = showFollow ? followUsername! : username;

  if (!showFollow && !showStats) return null;

  return (
    <>
      {showFollow ? (
        <div className="profile-actions pointer-events-none z-10 !top-[3.25rem]">
          <div className="profile-actions__end pointer-events-auto ml-auto">
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

      {showStats ? (
        <div className="absolute top-[14px] left-[14px] z-20 max-w-[min(40%,10rem)] rounded-2xl bg-[#e8eef5] px-2.5 py-1.5 shadow-sm [&_.profile-follow-count--compact]:!text-left">
          <ProfileFollowStats
            username={statsUsername}
            displayName={displayName}
            followerCount={followState!.followerCount}
            followingCount={followState!.followingCount}
            className="profile-follow-stats--compact !items-start"
            profileHref={profileHref}
          />
        </div>
      ) : null}
    </>
  );
}
