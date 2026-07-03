"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CopyIcon,
  FacebookIcon,
  InstagramIcon,
  TelegramIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/share/SharePlatformIcons";
import { finalizeTravelShare } from "@/lib/client/travel-share-snapshot";
import { captureProfileStoryCard } from "@/lib/client/capture-profile-story-card";
import { captureProfileSquareCard } from "@/lib/client/capture-profile-square-card";
import { profileMessages, shareMessages } from "@/lib/i18n/client-messages";
import { buildTravelUpdateShareText } from "@/lib/utils/travel-update";
import { profileShareUrl } from "@/lib/seo/site";
import type { TravelUpdateDelta } from "@/lib/utils/travel-update";

type ShareTravelUpdateModalProps = {
  open: boolean;
  onClose: () => void;
  username: string;
  displayName: string;
  delta: TravelUpdateDelta;
  persistShareSnapshot?: boolean;
};

function encode(text: string): string {
  return encodeURIComponent(text);
}

export function ShareTravelUpdateModal({
  open,
  onClose,
  username,
  displayName,
  delta,
  persistShareSnapshot = true,
}: ShareTravelUpdateModalProps) {
  const router = useRouter();
  const [downloading, setDownloading] = useState<"square" | "story" | null>(null);

  const shareUrl = profileShareUrl(username);
  const shareText = buildTravelUpdateShareText(displayName, delta, username, shareUrl);
  const captionText = shareText.replace(shareUrl, "").trim();
  const hasUpdate = delta.hasChanges;

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encode(shareText)}`,
    telegram: `https://t.me/share/url?url=${encode(shareUrl)}&text=${encode(captionText)}`,
    x: `https://x.com/intent/post?text=${encode(shareText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encode(shareUrl)}`,
  };

  useEffect(() => {
    if (!open) {
      setDownloading(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const completeShare = useCallback(async () => {
    onClose();
    if (!persistShareSnapshot) return;
    await finalizeTravelShare(() => router.refresh());
  }, [onClose, persistShareSnapshot, router]);

  async function downloadImage(format: "square" | "story") {
    setDownloading(format);
    let success = false;
    try {
      const blob =
        format === "story"
          ? await captureProfileStoryCard()
          : await captureProfileSquareCard(displayName);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `travelerpin-${format}-${username}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      success = true;
    } catch (error) {
      const message =
        error instanceof Error && error.message === "missing-capture-region"
          ? profileMessages.storyCaptureMissing
          : profileMessages.storyCaptureFailed;
      window.alert(message);
    } finally {
      setDownloading(null);
    }

    if (success) {
      await completeShare();
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText);
      await completeShare();
    } catch {
      window.alert(shareMessages.copyFailed);
    }
  }

  function openLink(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    void completeShare();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label={shareMessages.close}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="travel-update-share-title"
        className="relative z-10 w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-center">
          <h2
            id="travel-update-share-title"
            className="text-lg font-semibold text-slate-900 dark:text-white"
          >
            {hasUpdate
              ? profileMessages.shareTravelUpdate
              : profileMessages.travelUpdateDownloadCard}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={shareMessages.close}
            className="absolute right-4 top-4 rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-4 text-center text-sm text-slate-600 dark:text-slate-300">
          {profileMessages.travelUpdateImageHint}
        </p>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => void downloadImage("square")}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {downloading === "square"
              ? profileMessages.travelUpdateDownloading
              : profileMessages.travelUpdateDownloadSquare}
          </button>
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => void downloadImage("story")}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {downloading === "story"
              ? profileMessages.travelUpdateDownloading
              : profileMessages.travelUpdateDownloadStory}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            {
              id: "x",
              label: shareMessages.x,
              icon: <XIcon className="h-7 w-7" />,
              iconClassName: "bg-black",
              onClick: () => openLink(shareLinks.x),
            },
            {
              id: "whatsapp",
              label: shareMessages.whatsapp,
              icon: <WhatsAppIcon className="h-7 w-7" />,
              iconClassName: "bg-[#25D366]",
              onClick: () => openLink(shareLinks.whatsapp),
            },
            {
              id: "telegram",
              label: shareMessages.telegram,
              icon: <TelegramIcon className="h-6 w-6" />,
              iconClassName: "bg-[#26A5E4]",
              onClick: () => openLink(shareLinks.telegram),
            },
            {
              id: "facebook",
              label: shareMessages.facebook,
              icon: <FacebookIcon className="h-7 w-7" />,
              iconClassName: "bg-[#1877F2]",
              onClick: () => openLink(shareLinks.facebook),
            },
            {
              id: "instagram",
              label: shareMessages.instagram,
              icon: <InstagramIcon className="h-6 w-6" />,
              iconClassName: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
              onClick: () => {
                void handleCopy();
              },
            },
            {
              id: "copy",
              label: shareMessages.copy,
              icon: <CopyIcon className="h-6 w-6" />,
              iconClassName: "bg-slate-500",
              onClick: () => {
                void handleCopy();
              },
            },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={option.onClick}
              className="flex flex-col items-center gap-2 rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-sm ${option.iconClassName}`}
              >
                {option.icon}
              </span>
              <span className="max-w-[5.5rem] truncate text-center text-xs font-medium text-slate-700 dark:text-slate-200">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
