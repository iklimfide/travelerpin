"use client";

import { useEffect } from "react";

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

  return (
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
        onClick={onClose}
      >
        ×
      </button>
      <div className="profile-avatar-lightbox__panel" onClick={(event) => event.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="profile-avatar-lightbox__photo" />
      </div>
    </div>
  );
}
