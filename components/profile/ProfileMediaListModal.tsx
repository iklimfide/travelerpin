"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAppMessages } from "@/lib/i18n/client-messages";

type ProfileMediaListModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  closeOnEscape?: boolean;
  children: ReactNode;
};

export function ProfileMediaListModal({
  open,
  title,
  onClose,
  closeOnEscape = true,
  children,
}: ProfileMediaListModalProps) {
  const { share: shareMessages } = useAppMessages();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !closeOnEscape) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, closeOnEscape]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="profile-followers-modal profile-media-list-modal" role="presentation">
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
        className="profile-followers-modal__sheet profile-media-list-modal__sheet"
      >
        <div className="profile-media-list-modal__head">
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

        <div className="profile-media-list-modal__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
