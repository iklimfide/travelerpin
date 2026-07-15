"use client";

import { useContext, useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { NotificationsContext } from "@/components/notifications/NotificationsProvider";
import { useIsDesktopDashboardNav } from "@/lib/hooks/useIsDesktopDashboardNav";
import { shareMessages } from "@/lib/i18n/client-messages";
import {
  getFixedMenuBelowPosition,
  type FixedMenuPosition,
} from "@/lib/utils/fixed-menu-position";
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
  const notifications = useContext(NotificationsContext);
  const isDesktopNav = useIsDesktopDashboardNav();
  const [sheetPosition, setSheetPosition] = useState<FixedMenuPosition | null>(null);
  const [anchorMissing, setAnchorMissing] = useState(false);
  const useAnchoredDesktopSheet = isDesktopNav && Boolean(notifications?.triggerRef);
  const useAnchoredLayout = useAnchoredDesktopSheet && !anchorMissing;

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open || !useAnchoredDesktopSheet) {
      setSheetPosition(null);
      setAnchorMissing(false);
      return;
    }

    const anchor = notifications?.triggerRef.current;
    if (!anchor) {
      // Bottom bar may not be mounted yet (or /notifications deep-link) — show centered sheet.
      setSheetPosition(null);
      setAnchorMissing(true);
      return;
    }

    setAnchorMissing(false);
    setSheetPosition(getFixedMenuBelowPosition(anchor));
  }, [notifications?.triggerRef, open, useAnchoredDesktopSheet]);

  useEffect(() => {
    if (!open || !useAnchoredLayout) return;

    const anchor = notifications?.triggerRef.current;
    if (!anchor) return;

    const syncPosition = () => {
      setSheetPosition(getFixedMenuBelowPosition(anchor));
    };

    const viewport = window.visualViewport;
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);
    viewport?.addEventListener("resize", syncPosition);
    viewport?.addEventListener("scroll", syncPosition);

    return () => {
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
      viewport?.removeEventListener("resize", syncPosition);
      viewport?.removeEventListener("scroll", syncPosition);
    };
  }, [notifications?.triggerRef, open, useAnchoredLayout]);

  if (!open) return null;

  const sheetStyle: CSSProperties | undefined =
    useAnchoredLayout && sheetPosition
      ? {
          top: sheetPosition.top,
          right: sheetPosition.right,
        }
      : undefined;

  return (
    <div
      className={`notifications-modal${
        useAnchoredLayout && sheetPosition ? " notifications-modal--anchored" : ""
      }`}
      role="presentation"
    >
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
        className={`notifications-modal__sheet${
          useAnchoredLayout && sheetPosition ? " notifications-modal__sheet--anchored" : ""
        }`}
        style={sheetStyle}
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
