"use client";

import { useEffect, useState } from "react";
import { Link } from "@/lib/i18n/navigation";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { ProfileFollowListModal } from "@/components/profile/ProfileFollowListModal";
import { prefetchProfileFollowLists } from "@/lib/client/follow-actions";
import { isDemoProfileUsername } from "@/lib/data/demo-profile-username";
import { formatMessage, type AppMessages, useAppMessages } from "@/lib/i18n/client-messages";
import type { ProfileFollowListType } from "@/types/database";

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
  /** When set (home demo card), counts link to the profile instead of opening list modals. */
  profileHref?: string;
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
  profileHref,
}: ProfileFollowStatsProps) {
  const { profile: profileMessages } = useAppMessages();
  const authModal = useAuthModal();
  const [openList, setOpenList] = useState<ProfileFollowListType | null>(null);

  const isDemoProfile = isDemoProfileUsername(username);

  useEffect(() => {
    if (profileHref || isDemoProfile) return;
    prefetchProfileFollowLists(username, followerCount, followingCount);
  }, [profileHref, isDemoProfile, username, followerCount, followingCount]);

  function handleStatClick(type: ProfileFollowListType) {
    // Demo profiles have no real follow lists — invite the visitor to sign up instead.
    if (isDemoProfile) {
      authModal.open({ mode: "register" });
      return;
    }
    setOpenList(type);
  }

  if (followerCount <= 0 && followingCount <= 0) return null;

  const statsClass = `profile-follow-stats${className ? ` ${className}` : ""}`;
  const compactButtonClass = className.includes("profile-follow-stats--compact")
    ? " profile-follow-count--compact"
    : "";

  if (profileHref) {
    return (
      <div className={statsClass}>
        {followingCount > 0 ? (
          <Link
            href={profileHref}
            className={`profile-follow-count profile-follow-count--link${compactButtonClass}`}
            aria-label={`${displayName}'s profile`}
          >
            {followingCountLabel(profileMessages, followingCount)}
          </Link>
        ) : null}
        {followerCount > 0 ? (
          <Link
            href={profileHref}
            className={`profile-follow-count profile-follow-count--link${compactButtonClass}`}
            aria-label={`${displayName}'s profile`}
          >
            {followerCountLabel(profileMessages, followerCount)}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className={statsClass}>
        {followingCount > 0 ? (
          <FollowStatButton
            label={followingCountLabel(profileMessages, followingCount)}
            ariaLabel={formatMessage(profileMessages.viewFollowing, {
              label: followingCountLabel(profileMessages, followingCount),
            })}
            onClick={() => handleStatClick("following")}
            className={compactButtonClass.trim()}
          />
        ) : null}
        {followerCount > 0 ? (
          <FollowStatButton
            label={followerCountLabel(profileMessages, followerCount)}
            ariaLabel={formatMessage(profileMessages.viewFollowers, {
              label: followerCountLabel(profileMessages, followerCount),
            })}
            onClick={() => handleStatClick("followers")}
            className={compactButtonClass.trim()}
          />
        ) : null}
      </div>

      {openList ? (
        <ProfileFollowListModal
          username={username}
          displayName={displayName}
          listType={openList}
          open
          onClose={() => setOpenList(null)}
        />
      ) : null}
    </>
  );
}
