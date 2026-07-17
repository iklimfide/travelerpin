"use client";

import { useEffect, useState } from "react";
import { ProfileFollowListModal } from "@/components/profile/ProfileFollowListModal";
import { fetchProfileFollowers, fetchProfileFollowing } from "@/lib/client/follow-actions";
import { isDemoProfileUsername } from "@/lib/data/demo-profile-username";
import { formatMessage, type AppMessages, useAppMessages } from "@/lib/i18n/client-messages";
import type { ProfileFollowerSummary, ProfileFollowListType } from "@/types/database";

function followerCountLabel(profile: AppMessages["profile"], count: number): string {
  if (count === 1) return profile.followersOne;
  return formatMessage(profile.followers, { count });
}

function followingCountLabel(profile: AppMessages["profile"], count: number): string {
  if (count === 1) return profile.followingOne;
  return formatMessage(profile.followingCount, { count });
}

type ProfileFollowStatsProps = {
  username: string;
  displayName: string;
  followerCount: number;
  followingCount: number;
  className?: string;
};

type PrefetchedFollowList = {
  members: ProfileFollowerSummary[];
  demo: boolean;
};

function FollowStatButton({
  label,
  ariaLabel,
  onClick,
  className = "",
}: {
  label: string;
  ariaLabel: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`profile-follow-count profile-follow-count--link${className ? ` ${className}` : ""}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {label}
    </button>
  );
}

export function ProfileFollowStats({
  username,
  displayName,
  followerCount,
  followingCount,
  className = "",
}: ProfileFollowStatsProps) {
  const { profile: profileMessages } = useAppMessages();
  const [openList, setOpenList] = useState<ProfileFollowListType | null>(null);
  const [prefetchedFollowers, setPrefetchedFollowers] = useState<PrefetchedFollowList | null>(null);
  const [prefetchedFollowing, setPrefetchedFollowing] = useState<PrefetchedFollowList | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (isDemoProfileUsername(username)) {
      if (followerCount > 0) {
        setPrefetchedFollowers({ members: [], demo: true });
      }
      if (followingCount > 0) {
        setPrefetchedFollowing({ members: [], demo: true });
      }
      return;
    }

    if (followerCount > 0) {
      void fetchProfileFollowers(username).then((result) => {
        if (cancelled || !result.ok) return;
        setPrefetchedFollowers({
          members: result.followers,
          demo: result.demo === true,
        });
      });
    }

    if (followingCount > 0) {
      void fetchProfileFollowing(username).then((result) => {
        if (cancelled || !result.ok) return;
        setPrefetchedFollowing({
          members: result.following,
          demo: result.demo === true,
        });
      });
    }

    return () => {
      cancelled = true;
    };
  }, [followerCount, followingCount, username]);

  if (followerCount <= 0 && followingCount <= 0) return null;

  const statsClass = `profile-follow-stats${className ? ` ${className}` : ""}`;
  const compactButtonClass = className.includes("profile-follow-stats--compact")
    ? " profile-follow-count--compact"
    : "";

  return (
    <>
      <div className={statsClass}>
        {followingCount > 0 ? (
          <FollowStatButton
            label={followingCountLabel(profileMessages, followingCount)}
            ariaLabel={formatMessage(profileMessages.viewFollowing, {
              label: followingCountLabel(profileMessages, followingCount),
            })}
            onClick={() => setOpenList("following")}
            className={compactButtonClass.trim()}
          />
        ) : null}
        {followerCount > 0 ? (
          <FollowStatButton
            label={followerCountLabel(profileMessages, followerCount)}
            ariaLabel={formatMessage(profileMessages.viewFollowers, {
              label: followerCountLabel(profileMessages, followerCount),
            })}
            onClick={() => setOpenList("followers")}
            className={compactButtonClass.trim()}
          />
        ) : null}
      </div>

      {openList ? (
        <ProfileFollowListModal
          username={username}
          displayName={displayName}
          listType={openList}
          initialMembers={
            openList === "followers"
              ? prefetchedFollowers?.members
              : prefetchedFollowing?.members
          }
          initialDemo={
            openList === "followers"
              ? prefetchedFollowers?.demo
              : prefetchedFollowing?.demo
          }
          open
          onClose={() => setOpenList(null)}
        />
      ) : null}
    </>
  );
}
