"use client";

import { useState } from "react";
import { useModal } from "@/components/ui/ModalProvider";
import { notifyProfileDataChanged } from "@/lib/client/session-page-cache";
import { useAppMessages } from "@/lib/i18n/client-messages";

type WishlistSettingsProps = {
  wishlistPublic: boolean;
};

export function WishlistSettings({ wishlistPublic }: WishlistSettingsProps) {
  const { wishlist: wishlistMessages } = useAppMessages();
  const modal = useModal();
  const [enabled, setEnabled] = useState(wishlistPublic);
  const [loading, setLoading] = useState(false);

  async function handleToggle(next: boolean) {
    setEnabled(next);
    setLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishlist_public: next }),
      });

      if (!res.ok) {
        const data = await res.json();
        setEnabled(!next);
        await modal.alert(data.error ?? "Could not update settings", { variant: "error" });
        return;
      }

      notifyProfileDataChanged();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
      <h2 className="text-sm font-semibold text-white">{wishlistMessages.settingsTitle}</h2>
      <p className="mt-1 text-xs text-slate-500">{wishlistMessages.settingsHint}</p>

      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={loading}
          onChange={(e) => handleToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-950 text-amber-500 focus:ring-amber-500/40"
        />
        <span className="text-sm text-slate-300">
          <span className="font-medium text-white">{wishlistMessages.publicLabel}</span>
          <span className="mt-0.5 block text-xs text-slate-500">{wishlistMessages.publicHint}</span>
        </span>
      </label>
    </section>
  );
}
