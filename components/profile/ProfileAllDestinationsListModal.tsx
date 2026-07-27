"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAppMessages } from "@/lib/i18n/client-messages";
import { useLockBodyScroll } from "@/lib/hooks/useLockBodyScroll";

type ProfileAllDestinationsListModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  closeOnEscape?: boolean;
  toolbar?: ReactNode;
  children: ReactNode;
};

export function ProfileAllDestinationsListModal({
  open,
  title,
  onClose,
  closeOnEscape = true,
  toolbar = null,
  children,
}: ProfileAllDestinationsListModalProps) {
  const { share: shareMessages } = useAppMessages();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open || !closeOnEscape) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, closeOnEscape]);

  if (!open || !mounted) return null;

  const titleId = "profile-all-destinations-list-title";

  return createPortal(
    <div className="profile-followers-modal profile-all-destinations-modal" role="presentation">
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
        className="profile-followers-modal__sheet profile-all-destinations-modal__sheet"
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

        {toolbar}

        <div className="profile-all-destinations-modal__body">
          <div className="profile-all-grid" role="list" aria-label={title}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
