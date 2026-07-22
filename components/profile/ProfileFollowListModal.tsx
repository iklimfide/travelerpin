"use client";

import { useEffect, useState } from "react";
import { Link } from "@/lib/i18n/navigation";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { readFollowListCache } from "@/lib/client/follow-cache";
import { fetchProfileFollowers, fetchProfileFollowing } from "@/lib/client/follow-actions";
import { formatMessage, useAppMessages } from "@/lib/i18n/client-messages";
import type { ProfileFollowerSummary, ProfileFollowListType } from "@/types/database";

type ProfileFollowListModalProps = {
  username: string;
  displayName: string;
  listType: ProfileFollowListType;
  initialMembers?: ProfileFollowerSummary[];
  initialDemo?: boolean;
  open: boolean;
  onClose: () => void;
};

function readCachedMembers(
  username: string,
  listType: ProfileFollowListType
): { members: ProfileFollowerSummary[]; demo?: boolean } | null {
  return readFollowListCache(username, listType);
}

export function ProfileFollowListModal({
  username,
  displayName,
  listType,
  initialMembers,
  initialDemo = false,
  open,
  onClose,
}: ProfileFollowListModalProps) {
  const { share: shareMessages, profile: profileMessages } = useAppMessages();
  const cachedOnOpen = open ? readCachedMembers(username, listType) : null;
  const [members, setMembers] = useState<ProfileFollowerSummary[]>(
    () => initialMembers ?? cachedOnOpen?.members ?? []
  );
  const [loading, setLoading] = useState(
    () => open && !initialMembers && !cachedOnOpen
  );
  const [demo, setDemo] = useState(initialDemo || cachedOnOpen?.demo === true);
  const [error, setError] = useState<string | null>(null);

  const isFollowers = listType === "followers";
  const title = isFollowers
    ? formatMessage(profileMessages.followersTitleNamed, { name: displayName })
    : formatMessage(profileMessages.followingTitleNamed, { name: displayName });
  const loadingMessage = isFollowers
    ? profileMessages.followersLoading
    : profileMessages.followingLoading;
  const emptyMessage = demo
    ? isFollowers
      ? profileMessages.followersDemoEmpty
      : profileMessages.followingDemoEmpty
    : isFollowers
      ? profileMessages.followersEmpty
      : profileMessages.followingEmpty;

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (initialMembers) {
      setMembers(initialMembers);
      setDemo(initialDemo);
      setLoading(false);
      return;
    }

    const cached = readCachedMembers(username, listType);
    if (cached) {
      setMembers(cached.members);
      setDemo(cached.demo === true);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function loadMembers() {
      if (isFollowers) {
        const result = await fetchProfileFollowers(username);
        if (cancelled) return;
        setLoading(false);
        if (!result.ok) {
          setError(result.error);
          setMembers([]);
          setDemo(false);
          return;
        }
        setMembers(result.followers);
        setDemo(result.demo === true);
        return;
      }

      const result = await fetchProfileFollowing(username);
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        setMembers([]);
        setDemo(false);
        return;
      }
      setMembers(result.following);
      setDemo(result.demo === true);
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [open, username, listType, isFollowers, initialMembers, initialDemo]);

  if (!open) return null;

  const titleId = `profile-follow-list-title-${listType}`;

  return (
    <div className="profile-followers-modal" role="presentation">
      <button
        type="button"
        aria-label={shareMessages.close}
        className="profile-followers-modal__backdrop"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="profile-followers-modal__sheet"
      >
        <div className="profile-all-destinations-modal__head">
          <h2 id={titleId} className="profile-followers-modal__title">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={shareMessages.close}
            className="profile-followers-modal__close"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <p className="profile-followers-modal__status">{loadingMessage}</p>
        ) : error ? (
          <p className="profile-followers-modal__status profile-followers-modal__status--error">{error}</p>
        ) : members.length === 0 ? (
          <p className="profile-followers-modal__status">{emptyMessage}</p>
        ) : (
          <ul className="profile-followers-list">
            {members.map((member) => (
              <li key={member.username}>
                <Link
                  href={member.profilePath}
                  className="profile-followers-list__item"
                  onClick={onClose}
                >
                  <ProfileAvatar
                    avatarUrl={member.avatarUrl}
                    displayName={member.displayName}
                    username={member.username}
                    size="sm"
                  />
                  <span className="profile-followers-list__meta">
                    <span className="profile-followers-list__name">{member.displayName}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
