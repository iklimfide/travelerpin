"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useModal } from "@/components/ui/ModalProvider";
import { ShareSheetModal } from "@/components/share/ShareSheetModal";
import { buildShareText, buildShareUrlOnly } from "@/lib/seo/profile";
import { profileShareUrl } from "@/lib/seo/site";
import { formatMessage, shareMessages, useAppMessages } from "@/lib/i18n/client-messages";
import { isLocale, type Locale } from "@/lib/i18n/config";
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
  const modal = useModal();
  const { share: shareCopy } = useAppMessages();
  const localeRaw = useLocale();
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";

  const shareUrl = profileShareUrl(username, locale);
  // Messengers already show OG title/description on the preview card — send URL only.
  const shareUrlOnly = buildShareUrlOnly(username, shareUrl, locale);
  // X benefits from explicit caption text in the composer.
  const shareText = buildShareText(displayName, stats, username, {
    url: shareUrl,
    isOwnProfile,
    locale,
    copy: {
      captionOwn: shareCopy.captionOwn,
      captionGuest: shareCopy.captionGuest,
      captionDescription: shareCopy.captionDescription,
    },
  });

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encode(shareUrlOnly)}`,
    telegram: `https://t.me/share/url?url=${encode(shareUrlOnly)}&text=${encode(
      isOwnProfile
        ? shareCopy.captionOwn
        : formatMessage(shareCopy.captionGuest, { name: displayName })
    )}`,
    x: `https://x.com/intent/post?text=${encode(shareText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encode(shareUrlOnly)}`,
  };

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrlOnly);
      await onShareComplete?.();
    } catch {
      await modal.alert(shareMessages.copyFailed, { variant: "error" });
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
  const { share: shareMessages } = useAppMessages();
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
