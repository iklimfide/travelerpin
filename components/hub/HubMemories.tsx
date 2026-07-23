"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import { InstagramMemoryThumb } from "@/components/city/InstagramMemoryThumb";
import { HubMemoryLightbox } from "@/components/hub/HubMemoryLightbox";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { formatVisitDatesList } from "@/lib/utils/visit-date";
import { getIntlLocale } from "@/lib/i18n/config";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";

type HubMemoriesProps = {
  hubName: string;
  pins: HubTravelerPin[];
  labels: {
    heading: string;
    viewMap: string;
    viewPin: string;
    close: string;
    instagramPost: string;
  };
};

export function HubMemories({ hubName, pins, labels }: HubMemoriesProps) {
  const [expandedPin, setExpandedPin] = useState<HubTravelerPin | null>(null);

  if (pins.length === 0) return null;

  return (
    <>
      <section className="city-page__section" aria-labelledby="hub-memories-heading">
        <h2 id="hub-memories-heading" className="city-page__section-title">
          {labels.heading}
        </h2>
        <ul className="city-page__memories">
          {pins.map((pin) => {
            const visitDatesLabel =
              pin.visitDates.length > 0
                ? formatVisitDatesList(pin.visitDates, getIntlLocale())
                : null;
            const hasMedia = Boolean(pin.mediaUrl);
            const canExpand = hasMedia || Boolean(pin.note?.trim());

            return (
              <li key={pin.id} className="city-page__memory">
                {hasMedia && pin.mediaType === "photo" && pin.mediaUrl ? (
                  <Link
                    href={pin.profilePath}
                    className="city-page__memory-thumb-btn"
                    aria-label={`${pin.displayName} — ${labels.viewMap}`}
                    prefetch={false}
                  >
                    <Image
                      src={pin.mediaUrl}
                      alt=""
                      width={112}
                      height={112}
                      className="city-page__memory-thumb-image"
                      sizes="112px"
                    />
                  </Link>
                ) : hasMedia ? (
                  <button
                    type="button"
                    className="city-page__memory-thumb-btn"
                    onClick={() => setExpandedPin(pin)}
                    aria-label={`${labels.viewPin} — ${pin.displayName}`}
                  >
                    {pin.mediaType === "instagram" && pin.mediaUrl ? (
                      <InstagramMemoryThumb displayName={pin.displayName} />
                    ) : null}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="city-page__memory-thumb-btn city-page__memory-thumb-btn--note"
                    onClick={() => canExpand && setExpandedPin(pin)}
                    disabled={!canExpand}
                    aria-label={`${labels.viewPin} — ${pin.displayName}`}
                  >
                    <span className="city-page__memory-thumb-note-preview">
                      {pin.note?.trim() ?? ""}
                    </span>
                  </button>
                )}

                <div className="city-page__memory-body">
                  <Link href={pin.profilePath} className="city-page__memory-author" prefetch={false}>
                    <ProfileAvatar
                      avatarUrl={pin.avatarUrl}
                      displayName={pin.displayName}
                      username={pin.username}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="city-page__traveler-name">{pin.displayName}</p>
                      <p className="city-page__traveler-handle">@{pin.username}</p>
                      {pin.placeLabel ? (
                        <p className="city-page__memory-place">{pin.placeLabel}</p>
                      ) : null}
                    </div>
                  </Link>

                  {pin.note && hasMedia ? (
                    <p className="city-page__memory-note-preview">{pin.note}</p>
                  ) : null}

                  {visitDatesLabel ? (
                    <p className="city-page__memory-dates-preview">{visitDatesLabel}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {expandedPin ? (
        <HubMemoryLightbox
          pin={expandedPin}
          hubName={hubName}
          labels={{ viewMap: labels.viewMap, close: labels.close }}
          onClose={() => setExpandedPin(null)}
        />
      ) : null}
    </>
  );
}
