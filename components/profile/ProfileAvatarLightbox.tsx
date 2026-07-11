"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ProfileAvatarLightboxProps = {
  src: string;
  alt: string;
  closeLabel: string;
  onClose: () => void;
};

export function ProfileAvatarLightbox({
  src,
  alt,
  closeLabel,
  onClose,
}: ProfileAvatarLightboxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="profile-avatar-lightbox"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        type="button"
        className="profile-avatar-lightbox__close"
        aria-label={closeLabel}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        ✕
      </button>
      <div className="profile-avatar-lightbox__panel" onClick={(event) => event.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="profile-avatar-lightbox__photo"
          onClick={onClose}
        />
      </div>
    </div>,
    document.body
  );
}
