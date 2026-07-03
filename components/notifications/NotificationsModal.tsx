"use client";

import { useEffect } from "react";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { shareMessages } from "@/lib/i18n/client-messages";
import type { EnrichedNotificationRow } from "@/types/database";

type NotificationsModalProps = {
  open: boolean;
  onClose: () => void;
  initialNotifications?: EnrichedNotificationRow[];
  initialUnreadCount?: number;
};

export function NotificationsModal({
  open,
  onClose,
  initialNotifications,
  initialUnreadCount = 0,
}: NotificationsModalProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="notifications-modal" role="presentation">
      <button
        type="button"
        aria-label={shareMessages.close}
        className="notifications-modal__backdrop"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-modal-title"
        className="notifications-modal__sheet"
      >
        <NotificationsPanel
          variant="modal"
          onClose={onClose}
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />
      </div>
    </div>
  );
}
