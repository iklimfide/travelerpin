"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShareSheetModal } from "@/components/share/ShareSheetModal";
import { useShareProfile } from "@/components/share/ShareProfileButton";
import { ProfileSettingsIcon, ProfileShareIcon } from "@/components/profile/ProfileActionIcons";
import { finalizeTravelShare } from "@/lib/client/travel-share-snapshot";
import type { TravelStats } from "@/types/database";

type ProfileActionButtonsProps = {
  username: string;
  displayName: string;
  stats: TravelStats;
  isOwnProfile: boolean;
  shareLabel: string;
  editLabel: string;
};

export function ProfileActionButtons({
  username,
  displayName,
  stats,
  isOwnProfile,
  shareLabel,
  editLabel,
}: ProfileActionButtonsProps) {
  const router = useRouter();

  async function handleShareComplete() {
    if (!isOwnProfile) return;
    await finalizeTravelShare(() => router.refresh());
  }

  const { open, setOpen, shareLinks, handleCopy } = useShareProfile({
    username,
    displayName,
    stats,
    isOwnProfile,
    onShareComplete: isOwnProfile ? handleShareComplete : undefined,
  });

  return (
    <>
      <div className="profile-actions" data-story-exclude="">
        <button
          type="button"
          className="profile-small-action"
          aria-label={shareLabel}
          onClick={() => setOpen(true)}
        >
          <ProfileShareIcon />
        </button>
        {isOwnProfile ? (
          <Link href="/settings" className="profile-small-action" aria-label={editLabel}>
            <ProfileSettingsIcon />
          </Link>
        ) : (
          <span className="profile-small-action profile-small-action--placeholder" aria-hidden />
        )}
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
