"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { InstagramMemoryThumb } from "@/components/city/InstagramMemoryThumb";
import { HubExternalPhoto } from "@/components/hub/HubExternalPhoto";
import { HubMemoryLightbox } from "@/components/hub/HubMemoryLightbox";
import { HubSectionCta } from "@/components/hub/HubSectionCta";
import { HubSectionHeading } from "@/components/hub/HubSectionHeading";
import { ProfileDestinationEditModal } from "@/components/profile/ProfileDestinationEditModal";
import { useModal } from "@/components/ui/ModalProvider";
import { modalMessages } from "@/lib/i18n/client-messages";
import {
  removeCityInstagramUrl,
  removeCityPhoto,
  removeParkInstagramUrl,
  removeParkPhoto,
} from "@/lib/client/profile-media-update";
import type { HubGalleryItem } from "@/lib/supabase/hub-traveler-pin";
import { normalizeInstagramPostUrl } from "@/lib/utils/instagram";
import { parseProfilePinId } from "@/lib/utils/profile-media";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

type ProfileMediaGalleryLabels = {
  photosHeading: string;
  instagramHeading: string;
  noInstagramYet: string;
  viewPin: string;
  viewMap: string;
  close: string;
    instagramPost: string;
    viewAll: string;
  editMedia: string;
  removeMedia: string;
  removePhotoTitle: string;
  removePhotoMessage: string;
  removeInstagramTitle: string;
  removeInstagramMessage: string;
};

type ProfileMediaGalleryProps = {
  hubName: string;
  variant: "photos" | "instagram";
  headingId: string;
  items: HubGalleryItem[];
  alwaysShow?: boolean;
  emptyLabel?: string;
  viewAllHref?: string;
  hideHeading?: boolean;
  isOwnProfile: boolean;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  labels: ProfileMediaGalleryLabels;
};

function MediaItemActions({
  onEdit,
  onRemove,
  editLabel,
  removeLabel,
}: {
  onEdit: () => void;
  onRemove: () => void;
  editLabel: string;
  removeLabel: string;
}) {
  return (
    <div className="profile-media-item__actions">
      <button
        type="button"
        className="profile-media-item__action"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onEdit();
        }}
      >
        {editLabel}
      </button>
      <button
        type="button"
        className="profile-media-item__action profile-media-item__action--remove"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove();
        }}
      >
        {removeLabel}
      </button>
    </div>
  );
}

function GalleryTile({
  item,
  hubName,
  labels,
  isOwnProfile,
  onSelect,
  onEdit,
  onRemove,
}: {
  item: HubGalleryItem;
  hubName: string;
  labels: ProfileMediaGalleryLabels;
  isOwnProfile: boolean;
  onSelect: (item: HubGalleryItem) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const ownerActions = isOwnProfile ? (
    <MediaItemActions
      editLabel={labels.editMedia}
      removeLabel={labels.removeMedia}
      onEdit={onEdit}
      onRemove={onRemove}
    />
  ) : null;

  if (item.mediaType === "instagram") {
    const instagramHref = normalizeInstagramPostUrl(item.mediaUrl);

    if (isOwnProfile) {
      return (
        <div className="profile-media-item">
          <a
            href={instagramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="city-page__traveler-picture-btn profile-media-item__link"
            aria-label={`${labels.instagramPost} — ${item.pin.placeLabel}`}
          >
            <InstagramMemoryThumb
              postUrl={item.mediaUrl}
              alt={`${hubName} — ${item.pin.placeLabel}`}
              instagramLabel={labels.instagramPost}
            />
          </a>
          {ownerActions}
        </div>
      );
    }

    return (
      <a
        href={instagramHref}
        target="_blank"
        rel="noopener noreferrer"
        className="city-page__traveler-picture-btn"
        aria-label={`${labels.instagramPost} — ${item.pin.placeLabel}`}
      >
        <InstagramMemoryThumb
          postUrl={item.mediaUrl}
          alt={`${hubName} — ${item.pin.placeLabel}`}
          instagramLabel={labels.instagramPost}
        />
      </a>
    );
  }

  if (isOwnProfile) {
    return (
      <div className="profile-media-item">
        <button
          type="button"
          className="city-page__traveler-picture-btn profile-media-item__link"
          onClick={() => onSelect(item)}
          aria-label={`${labels.viewPin} — ${item.pin.placeLabel}`}
        >
          <HubExternalPhoto
            src={item.mediaDisplayUrl ?? item.mediaUrl}
            alt={`${hubName} — ${item.pin.placeLabel}`}
            width={160}
            height={160}
            className="city-page__traveler-picture-image"
          />
        </button>
        {ownerActions}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="city-page__traveler-picture-btn"
      onClick={() => onSelect(item)}
      aria-label={`${labels.viewPin} — ${item.pin.placeLabel}`}
    >
      <HubExternalPhoto
        src={item.mediaDisplayUrl ?? item.mediaUrl}
        alt={`${hubName} — ${item.pin.placeLabel}`}
        width={160}
        height={160}
        className="city-page__traveler-picture-image"
      />
    </button>
  );
}

export function ProfileMediaGallery({
  hubName,
  variant,
  headingId,
  items,
  alwaysShow = false,
  emptyLabel,
  viewAllHref,
  hideHeading = false,
  isOwnProfile,
  visitedCountries,
  visitedCities,
  visitedParks,
  labels,
}: ProfileMediaGalleryProps) {
  const router = useRouter();
  const modal = useModal();
  const [expandedItem, setExpandedItem] = useState<HubGalleryItem | null>(null);
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [editingParkId, setEditingParkId] = useState<string | null>(null);

  const heading = variant === "photos" ? labels.photosHeading : labels.instagramHeading;

  const editingCity = visitedCities.find((city) => city.id === editingCityId) ?? null;
  const editingPark = visitedParks.find((park) => park.id === editingParkId) ?? null;

  function openEditForItem(item: HubGalleryItem) {
    const ref = parseProfilePinId(item.pin.id);
    if (!ref) return;

    if (ref.kind === "city") {
      setEditingParkId(null);
      setEditingCityId(ref.id);
      return;
    }

    setEditingCityId(null);
    setEditingParkId(ref.id);
  }

  async function handleRemoveItem(item: HubGalleryItem) {
    const ref = parseProfilePinId(item.pin.id);
    if (!ref) return;

    const confirmed = await modal.confirm(
      item.mediaType === "photo"
        ? labels.removePhotoMessage
        : labels.removeInstagramMessage,
      {
        title:
          item.mediaType === "photo"
            ? labels.removePhotoTitle
            : labels.removeInstagramTitle,
        destructive: true,
      }
    );
    if (!confirmed) return;

    let response: Response;
    if (ref.kind === "city") {
      const city = visitedCities.find((entry) => entry.id === ref.id);
      if (!city) return;
      response =
        item.mediaType === "photo"
          ? await removeCityPhoto(city)
          : await removeCityInstagramUrl(city, item.mediaUrl);
    } else {
      const park = visitedParks.find((entry) => entry.id === ref.id);
      if (!park) return;
      response =
        item.mediaType === "photo"
          ? await removeParkPhoto(park)
          : await removeParkInstagramUrl(park, item.mediaUrl);
    }

    if (!response.ok) {
      const data = await response.json();
      await modal.alert(data.error ?? modalMessages.errorTitle, { variant: "error" });
      return;
    }

    router.refresh();
  }

  let headingCta: ReactNode = null;
  if (viewAllHref) {
    headingCta = (
      <HubSectionCta
        label={labels.viewAll}
        href={viewAllHref}
        className="profile-media-view-all"
      />
    );
  }

  if (items.length === 0 && !(alwaysShow && variant === "instagram")) {
    return null;
  }

  return (
    <>
      <section className="city-page__section" aria-labelledby={headingId}>
        {hideHeading ? null : (
          <HubSectionHeading id={headingId} title={heading} cta={headingCta} />
        )}
        {items.length > 0 ? (
          <div className="city-page__hub-photo-gallery">
            <ul className="city-page__traveler-pictures-grid">
              {items.map((item) => (
                <li key={item.id}>
                  <GalleryTile
                    item={item}
                    hubName={hubName}
                    labels={labels}
                    isOwnProfile={isOwnProfile}
                    onSelect={setExpandedItem}
                    onEdit={() => openEditForItem(item)}
                    onRemove={() => handleRemoveItem(item)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : emptyLabel ? (
          <p className="city-page__empty">{emptyLabel}</p>
        ) : null}
      </section>

      {expandedItem?.mediaType === "photo" ? (
        <HubMemoryLightbox
          pin={expandedItem.pin}
          activeMediaType="photo"
          activeMediaUrl={expandedItem.mediaUrl}
          activeMediaDisplayUrl={expandedItem.mediaDisplayUrl}
          hubName={hubName}
          labels={{ viewMap: labels.viewMap, close: labels.close }}
          onClose={() => setExpandedItem(null)}
        />
      ) : null}

      {isOwnProfile ? (
        <ProfileDestinationEditModal
          city={editingCity}
          park={editingPark}
          visitedCountries={visitedCountries}
          onClose={() => {
            setEditingCityId(null);
            setEditingParkId(null);
          }}
        />
      ) : null}
    </>
  );
}
