import type { ReactNode } from "react";
import Link from "next/link";
import { InstagramMemoryThumb } from "@/components/city/InstagramMemoryThumb";
import { HubExternalPhoto } from "@/components/hub/HubExternalPhoto";
import { HubSectionHeading } from "@/components/hub/HubSectionHeading";
import { normalizeInstagramPostUrl } from "@/lib/utils/instagram";
import { hubGalleryPhotoSrc } from "@/lib/storage/hub-photo-url";
import type { HubGalleryItem, HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
import { expandHubPinGalleryItems } from "@/lib/supabase/hub-traveler-pin";

type HubTravelerPicturesProps = {
  hubName: string;
  pins: HubTravelerPin[];
  variant: "photos" | "instagram";
  alwaysShow?: boolean;
  emptyLabel?: string;
  headingId: string;
  headingCta?: ReactNode;
  labels: {
    photosHeading: string;
    instagramHeading: string;
    viewPin: string;
    viewMap: string;
    close: string;
    instagramPost: string;
  };
};

function GalleryGrid({
  items,
  hubName,
  labels,
}: {
  items: HubGalleryItem[];
  hubName: string;
  labels: HubTravelerPicturesProps["labels"];
}) {
  return (
    <ul className="city-page__traveler-pictures-grid">
      {items.map((item) => (
        <li key={item.id}>
          {item.mediaType === "instagram" ? (
            <a
              href={normalizeInstagramPostUrl(item.mediaUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="city-page__traveler-picture-btn"
              aria-label={`${labels.instagramPost} — ${item.pin.displayName}`}
            >
              <InstagramMemoryThumb displayName={item.pin.displayName} />
            </a>
          ) : (
            (() => {
              const photoSrc = hubGalleryPhotoSrc(item);
              return photoSrc ? (
                <Link
                  href={item.pin.profilePath}
                  className="city-page__traveler-picture-btn"
                  aria-label={`${item.pin.displayName} — ${labels.viewMap}`}
                >
                  <HubExternalPhoto
                    src={photoSrc}
                    alt={`${hubName} — ${item.pin.displayName}`}
                    width={160}
                    height={160}
                    className="city-page__traveler-picture-image"
                  />
                </Link>
              ) : null;
            })()
          )}
        </li>
      ))}
    </ul>
  );
}

export function HubTravelerPictures({
  hubName,
  pins,
  variant,
  alwaysShow = false,
  emptyLabel,
  headingId,
  headingCta,
  labels,
}: HubTravelerPicturesProps) {
  const galleryItems = expandHubPinGalleryItems(pins);
  const photoItems = galleryItems.filter((item) => item.mediaType === "photo");
  const instagramItems = galleryItems.filter((item) => item.mediaType === "instagram");
  const items = variant === "photos" ? photoItems : instagramItems;
  const heading = variant === "photos" ? labels.photosHeading : labels.instagramHeading;

  if (items.length === 0 && !alwaysShow) {
    return null;
  }

  return (
    <section className="city-page__section" aria-labelledby={headingId}>
      <HubSectionHeading id={headingId} title={heading} cta={headingCta} />
      {items.length > 0 ? (
        <div className="city-page__hub-photo-gallery">
          <GalleryGrid items={items} hubName={hubName} labels={labels} />
        </div>
      ) : emptyLabel ? (
        <p className="city-page__empty">{emptyLabel}</p>
      ) : null}
    </section>
  );
}
