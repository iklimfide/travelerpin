"use client";

import { useEffect } from "react";
import Link from "next/link";
import { InstagramEmbed } from "@/components/media/InstagramEmbed";
import { HubExternalPhoto } from "@/components/hub/HubExternalPhoto";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { formatVisitDatesList } from "@/lib/utils/visit-date";
import { getIntlLocale } from "@/lib/i18n/config";
import { hubPinPhotoSrc } from "@/lib/storage/hub-photo-url";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
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
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
          <Link href={pin.profilePath} className="city-page__traveler-link">
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
              {pin.placeLabel ? (
                <p className="city-page__memory-place">{pin.placeLabel}</p>
              ) : null}
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
            <InstagramEmbed
              postUrl={mediaUrl}
              title={`${hubName} — ${pin.displayName} on Instagram`}
            />
          </div>
        ) : null}

        {pin.note ? <p className="city-page__memory-lightbox-note">{pin.note}</p> : null}
        {visitDatesLabel ? (
          <p className="city-page__memory-lightbox-dates">{visitDatesLabel}</p>
        ) : null}

        <div className="city-page__memory-lightbox-footer">
          <Link href={pin.profilePath} className="city-page__memory-map-link">
            {labels.viewMap}
          </Link>
        </div>
      </div>
    </div>
  );
}
