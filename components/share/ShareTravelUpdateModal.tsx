"use client";

import { useCallback, useEffect, useState } from "react";
import { finalizeTravelShare } from "@/lib/client/travel-share-snapshot";
import { captureProfileStoryCard } from "@/lib/client/capture-profile-story-card";
import {
  captureProfileSquareCard,
  profileSquareCaptureId,
} from "@/lib/client/capture-profile-square-card";
import { profileStoryCaptureId } from "@/lib/client/capture-profile-story-card";
import {
  downloadProfileNextRouteCardPng,
  isProfileNextRouteCaptureReady,
  PROFILE_NEXT_ROUTE_CAPTURE_ID,
} from "@/lib/client/capture-profile-next-route-card";
import { useModal } from "@/components/ui/ModalProvider";
import { useAppMessages } from "@/lib/i18n/client-messages";
import type { TravelUpdateDelta } from "@/lib/utils/travel-update";

type ShareDownloadFormat = "square" | "story" | "route";

type ShareTravelUpdateModalProps = {
  open: boolean;
  onClose: () => void;
  username: string;
  displayName: string;
  delta: TravelUpdateDelta;
  persistShareSnapshot?: boolean;
};

export function ShareTravelUpdateModal({
  open,
  onClose,
  username,
  displayName,
  delta,
  persistShareSnapshot = true,
}: ShareTravelUpdateModalProps) {
  const { share: shareMessages, profile: profileMessages, nextRoute: nextRouteMessages } =
    useAppMessages();
  const modal = useModal();
  const [downloading, setDownloading] = useState<ShareDownloadFormat | null>(null);
  const [hasNextRouteCard, setHasNextRouteCard] = useState(false);
  const hasUpdate = delta.hasChanges;

  useEffect(() => {
    if (!open) {
      setDownloading(null);
      setHasNextRouteCard(false);
      return;
    }

    setHasNextRouteCard(
      Boolean(
        document.querySelector(`#${PROFILE_NEXT_ROUTE_CAPTURE_ID}[data-route-capture-ready]`)
      )
    );
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
    await finalizeTravelShare(username);
  }, [onClose, persistShareSnapshot, username]);

  async function downloadImage(format: ShareDownloadFormat) {
    if (format === "route") {
      if (!isProfileNextRouteCaptureReady()) {
        await modal.alert(nextRouteMessages.downloadShareCardFailed, { variant: "error" });
        return;
      }
    } else {
      const captureId =
        format === "story" ? profileStoryCaptureId(username) : profileSquareCaptureId(username);

      if (!document.getElementById(captureId)) {
        await modal.alert(profileMessages.storyCaptureMissing, { variant: "error" });
        return;
      }
    }

    setDownloading(format);
    onClose();
    await new Promise((resolve) => window.setTimeout(resolve, 150));

    let success = false;
    try {
      if (format === "route") {
        await downloadProfileNextRouteCardPng(username);
      } else {
        const blob =
          format === "story"
            ? await captureProfileStoryCard(username)
            : await captureProfileSquareCard(displayName, username);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `travelerpin-${format}-${username}.png`;
        anchor.click();
        URL.revokeObjectURL(url);
      }
      success = true;
    } catch (error) {
      const message =
        error instanceof Error && error.message === "missing-capture-region"
          ? format === "route"
            ? nextRouteMessages.downloadShareCardFailed
            : profileMessages.storyCaptureMissing
          : format === "route"
            ? nextRouteMessages.downloadShareCardFailed
            : profileMessages.storyCaptureFailed;
      await modal.alert(message, { variant: "error" });
    } finally {
      setDownloading(null);
    }

    if (success) {
      await completeShare();
    }
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

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => void downloadImage("square")}
            className="share-travel-update-btn rounded-2xl px-4 py-3 text-sm font-semibold transition-colors"
          >
            {downloading === "square"
              ? profileMessages.travelUpdateDownloading
              : profileMessages.travelUpdateDownloadSquare}
          </button>
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => void downloadImage("story")}
            className="share-travel-update-btn rounded-2xl px-4 py-3 text-sm font-semibold transition-colors"
          >
            {downloading === "story"
              ? profileMessages.travelUpdateDownloading
              : profileMessages.travelUpdateDownloadStory}
          </button>
          {hasNextRouteCard ? (
            <button
              type="button"
              disabled={downloading !== null}
              onClick={() => void downloadImage("route")}
              className="share-travel-update-btn col-span-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors"
            >
              {downloading === "route"
                ? nextRouteMessages.downloadShareCardBusy
                : nextRouteMessages.downloadShareCard}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
