"use client";

import { useEffect } from "react";
import { Link } from "@/lib/i18n/navigation";
import { InstagramIcon } from "@/components/share/SharePlatformIcons";
import { HubExternalPhoto } from "@/components/hub/HubExternalPhoto";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { formatVisitDatesList } from "@/lib/utils/visit-date";
import { getIntlLocale } from "@/lib/i18n/config";
import { hubPinPhotoSrc } from "@/lib/storage/hub-photo-url";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
import { normalizeInstagramPostUrl } from "@/lib/utils/instagram";
import type { MediaType } from "@/types/database";

type HubMemoryLightboxProps = {
  pin: HubTravelerPin;
  activeMediaType?: MediaType | null;
  activeMediaUrl?: string | null;
  activeMediaDisplayUrl?: string | null;
  hubName: string;
  labels: {
    viewMap: string;
    close: string;
  };
  onClose: () => void;
};

export function HubMemoryLightbox({
  pin,
  activeMediaType,
  activeMediaUrl,
  activeMediaDisplayUrl,
  hubName,
  labels,
  onClose,
}: HubMemoryLightboxProps) {
  const mediaType = activeMediaType ?? pin.mediaType;
  const mediaUrl =
    activeMediaUrl ??
    pin.photoUrl ??
    (pin.mediaType === "instagram" ? pin.mediaUrl : null) ??
    pin.mediaUrl;
  const photoSrc =
    activeMediaDisplayUrl ??
    (mediaType === "photo"
      ? hubPinPhotoSrc({
          mediaDisplayUrl: pin.mediaDisplayUrl,
          photoUrl: pin.photoUrl,
          mediaUrl: pin.mediaUrl,
        })
      : null);

  const visitDatesLabel =
    pin.visitDates.length > 0
      ? formatVisitDatesList(pin.visitDates, getIntlLocale())
      : null;

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
      className="city-page__memory-lightbox"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-memory-lightbox-title"
    >
      <div className="city-page__memory-lightbox-panel" onClick={(e) => e.stopPropagation()}>
        <div className="city-page__memory-lightbox-header">
          <Link href={pin.profilePath} className="city-page__traveler-link" prefetch={false}>
            <ProfileAvatar
              avatarUrl={pin.avatarUrl}
              displayName={pin.displayName}
              username={pin.username}
              size="sm"
            />
            <div className="min-w-0">
              <p id="hub-memory-lightbox-title" className="city-page__traveler-name">
                {pin.displayName}
              </p>
              <p className="city-page__traveler-handle">@{pin.username}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="city-page__memory-lightbox-close"
            aria-label={labels.close}
          >
            ✕
          </button>
        </div>

        {pin.placeLabel ? (
          <div className="city-page__memory-lightbox-place">
            {pin.placePath ? (
              <Link
                href={pin.placePath}
                className="city-page__memory-place-link"
                prefetch={false}
                onClick={(event) => event.stopPropagation()}
              >
                {pin.placeLabel}
              </Link>
            ) : (
              <p className="city-page__memory-place">{pin.placeLabel}</p>
            )}
          </div>
        ) : null}

        {mediaType === "photo" && photoSrc ? (
          <div className="city-page__memory-lightbox-media">
            <HubExternalPhoto
              src={photoSrc}
              alt={`${hubName} — ${pin.displayName}`}
              className="city-page__memory-lightbox-photo"
            />
          </div>
        ) : null}

        {mediaType === "instagram" && mediaUrl ? (
          <div className="city-page__memory-lightbox-media city-page__memory-lightbox-media--instagram">
            <a
              href={normalizeInstagramPostUrl(mediaUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="city-page__memory-lightbox-instagram-link"
              aria-label={`Instagram — ${pin.displayName}`}
            >
              <InstagramIcon className="h-8 w-8" />
              <span>{pin.displayName}</span>
            </a>
          </div>
        ) : null}

        {pin.note ? <p className="city-page__memory-lightbox-note">{pin.note}</p> : null}
        {visitDatesLabel ? (
          <p className="city-page__memory-lightbox-dates">{visitDatesLabel}</p>
        ) : null}

        <div className="city-page__memory-lightbox-footer">
          <Link href={pin.profilePath} className="city-page__memory-map-link" prefetch={false}>
            {labels.viewMap}
          </Link>
        </div>
      </div>
    </div>
  );
}
