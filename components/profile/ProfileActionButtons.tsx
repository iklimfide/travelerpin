"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { ShareSheetModal } from "@/components/share/ShareSheetModal";
import { useShareProfile } from "@/components/share/ShareProfileButton";
import { ProfileShareIcon } from "@/components/profile/ProfileActionIcons";
import { ProfileFollowButton } from "@/components/profile/ProfileFollowButton";
import { ProfileFollowStats } from "@/components/profile/ProfileFollowStats";
import { finalizeTravelShare } from "@/lib/client/travel-share-snapshot";
import type { TravelStats } from "@/types/database";

type ProfileActionButtonsProps = {
  username: string;
  displayName: string;
  stats: TravelStats;
  isOwnProfile: boolean;
  shareLabel: string;
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
  stats,
  isOwnProfile,
  shareLabel,
  followUsername,
  followState,
  canFollow = false,
  isLoggedIn = false,
}: ProfileActionButtonsProps) {
  const router = useRouter();

  async function handleShareComplete() {
    if (!isOwnProfile) return;
    await finalizeTravelShare(() => router.refresh(), username);
  }

  const { open, setOpen, shareLinks, handleCopy } = useShareProfile({
    username,
    displayName,
    stats,
    isOwnProfile,
    onShareComplete: isOwnProfile ? handleShareComplete : undefined,
  });

  const showFollow = Boolean(followUsername && followState);
  const showOwnFollowStats = isOwnProfile && followState;

  return (
    <>
      <div className="profile-actions">
        <button
          type="button"
          className="profile-small-action"
          aria-label={shareLabel}
          data-story-exclude=""
          onClick={() => setOpen(true)}
        >
          <ProfileShareIcon />
        </button>

        <div className="profile-actions__end">
          {showFollow ? (
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
              />
            </Suspense>
          ) : showOwnFollowStats ? (
            <ProfileFollowStats
              username={username}
              displayName={displayName}
              followerCount={followState!.followerCount}
              followingCount={followState!.followingCount}
              className="profile-follow-stats--compact profile-follow-stats--solo"
            />
          ) : null}
        </div>
      </div>

      <ShareSheetModal
        open={open}
        onClose={() => setOpen(false)}
        onCopy={handleCopy}
        onShareComplete={isOwnProfile ? handleShareComplete : undefined}
        shareLinks={shareLinks}
      />
    </>
  );
}
