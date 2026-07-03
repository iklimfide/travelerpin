"use client";

import { useState } from "react";
import { ShareSheetModal } from "@/components/share/ShareSheetModal";
import { buildShareText, buildShareUrlOnly } from "@/lib/seo/profile";
import { profileShareUrl } from "@/lib/seo/site";
import { shareMessages } from "@/lib/i18n/client-messages";
import type { TravelStats } from "@/types/database";

type ShareProfileCoreProps = {
  username: string;
  displayName: string;
  stats: TravelStats;
  isOwnProfile?: boolean;
  onShareComplete?: () => void | Promise<void>;
};

function encode(text: string): string {
  return encodeURIComponent(text);
}

export function useShareProfile({
  username,
  displayName,
  stats,
  isOwnProfile = false,
  onShareComplete,
}: ShareProfileCoreProps) {
  const [open, setOpen] = useState(false);

  const shareUrl = profileShareUrl(username);
  // Messengers already show OG title/description on the preview card — send URL only.
  const shareUrlOnly = buildShareUrlOnly(username, shareUrl);
  // X benefits from explicit caption text in the composer.
  const shareText = buildShareText(displayName, stats, username, {
    url: shareUrl,
    isOwnProfile,
  });

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encode(shareUrlOnly)}`,
    telegram: `https://t.me/share/url?url=${encode(shareUrlOnly)}`,
    x: `https://x.com/intent/post?text=${encode(shareText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encode(shareUrlOnly)}`,
  };

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrlOnly);
      await onShareComplete?.();
    } catch {
      if (typeof window !== "undefined") {
        window.alert(shareMessages.copyFailed);
      }
    }
  }

  return {
    open,
    setOpen,
    shareLinks,
    handleCopy,
  };
}

type ShareProfileButtonProps = ShareProfileCoreProps & {
  className?: string;
};

export function ShareProfileButton({
  username,
  displayName,
  stats,
  isOwnProfile = true,
  className = "",
}: ShareProfileButtonProps) {
  const { open, setOpen, shareLinks, handleCopy } = useShareProfile({
    username,
    displayName,
    stats,
    isOwnProfile,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "inline-flex w-full shrink-0 items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500 sm:w-auto"
        }
      >
        {shareMessages.shareMyTravels}
      </button>

      <ShareSheetModal
        open={open}
        onClose={() => setOpen(false)}
        onCopy={handleCopy}
        shareLinks={shareLinks}
      />
    </>
  );
}
