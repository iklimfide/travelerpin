"use client";

import { ShareSheetModal } from "@/components/share/ShareSheetModal";
import { useAppMessages } from "@/lib/i18n/client-messages";
import { finalizeTravelShare } from "@/lib/client/travel-share-snapshot";
import type { TravelStats } from "@/types/database";
import { useShareProfile } from "@/components/share/ShareProfileButton";

type ShareProfileProps = {
  username: string;
  displayName: string;
  stats: TravelStats;
  isOwnProfile?: boolean;
};

export function ShareProfile({
  username,
  displayName,
  stats,
  isOwnProfile = false,
}: ShareProfileProps) {
  const { share: shareMessages } = useAppMessages();

  async function handleShareComplete() {
    if (!isOwnProfile) return;
    await finalizeTravelShare(username);
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
      <section className="flex w-full flex-col items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-5 text-center sm:px-6 sm:py-6">
        <div>
          <p className="font-medium text-foreground">
            {isOwnProfile ? shareMessages.ownTitle : shareMessages.guestTitle}
          </p>
          <p className="mt-1 text-sm text-slate-500">{shareMessages.hint}</p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          {shareMessages.shareMyTravels}
        </button>
      </section>

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
