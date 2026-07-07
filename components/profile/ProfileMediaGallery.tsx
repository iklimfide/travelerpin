"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ProfileInstagramLinkCard } from "@/components/profile/ProfileInstagramLinkCard";
import { HubExternalPhoto } from "@/components/hub/HubExternalPhoto";
import { HubMemoryLightbox } from "@/components/hub/HubMemoryLightbox";
import { HubSectionCta } from "@/components/hub/HubSectionCta";
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
import { hubGalleryPhotoSrc } from "@/lib/storage/hub-photo-url";
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
  viewLess?: string;
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
  /** Link to the full media page (profile preview). */
  viewAllHref?: string;
  /** Expand/collapse all items in-place (media page). */
  onViewAll?: () => void;
  viewAllExpanded?: boolean;
  /** Show All only when there are more items than the preview. */
  showViewAll?: boolean;
  hideHeading?: boolean;
  isOwnProfile: boolean;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  labels: ProfileMediaGalleryLabels;
  /** When set, photo tiles get a DOM id for in-page scroll targets. */
  photoAnchorPrefix?: string;
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
  photoAnchorPrefix,
}: {
  item: HubGalleryItem;
  hubName: string;
  labels: ProfileMediaGalleryLabels;
  isOwnProfile: boolean;
  onSelect: (item: HubGalleryItem) => void;
  onEdit: () => void;
  onRemove: () => void;
  photoAnchorPrefix?: string;
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

    // Photos stay only in the photos section — never duplicate them under Instagram links.
    const instagramLink = (
      <a
        href={instagramHref}
        target="_blank"
        rel="noopener noreferrer"
        className="city-page__traveler-picture-btn profile-media-item__link"
        aria-label={`${labels.instagramPost} — ${item.pin.displayName} — ${item.pin.placeLabel}`}
      >
        <ProfileInstagramLinkCard displayName={item.pin.displayName} />
      </a>
    );

    if (isOwnProfile) {
      return (
        <div className="profile-media-item">
          {instagramLink}
          {ownerActions}
        </div>
      );
    }

    return instagramLink;
  }

  if (isOwnProfile) {
    const photoSrc = hubGalleryPhotoSrc(item);
    const anchorId =
      photoAnchorPrefix && item.mediaType === "photo"
        ? `${photoAnchorPrefix}${item.id}`
        : undefined;
    return (
      <div className="profile-media-item" id={anchorId}>
        <button
          type="button"
          className="city-page__traveler-picture-btn profile-media-item__link"
          onClick={() => onSelect(item)}
          aria-label={`${labels.viewPin} — ${item.pin.placeLabel}`}
        >
          {photoSrc ? (
            <HubExternalPhoto
              src={photoSrc}
              alt={`${hubName} — ${item.pin.placeLabel}`}
              width={160}
              height={160}
              className="city-page__traveler-picture-image"
            />
          ) : null}
        </button>
        {ownerActions}
      </div>
    );
  }

  const photoSrc = hubGalleryPhotoSrc(item);
  const anchorId =
    photoAnchorPrefix && item.mediaType === "photo"
      ? `${photoAnchorPrefix}${item.id}`
      : undefined;
  return (
    <button
      id={anchorId}
      type="button"
      className="city-page__traveler-picture-btn"
      onClick={() => onSelect(item)}
      aria-label={`${labels.viewPin} — ${item.pin.placeLabel}`}
    >
      {photoSrc ? (
        <HubExternalPhoto
          src={photoSrc}
          alt={`${hubName} — ${item.pin.placeLabel}`}
          width={160}
          height={160}
          className="city-page__traveler-picture-image"
        />
      ) : null}
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
  onViewAll,
  viewAllExpanded = false,
  showViewAll,
  hideHeading = false,
  isOwnProfile,
  visitedCountries,
  visitedCities,
  visitedParks,
  labels,
  photoAnchorPrefix,
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

  const canShowViewAll = showViewAll ?? Boolean(onViewAll || viewAllHref);
  const viewAllLabel = viewAllExpanded
    ? (labels.viewLess ?? labels.viewAll)
    : labels.viewAll;

  let headingCta: ReactNode = null;
  if (canShowViewAll && onViewAll) {
    headingCta = (
      <button
        type="button"
        className="profile-media-box__all"
        onClick={onViewAll}
        aria-expanded={viewAllExpanded}
      >
        {viewAllLabel}
      </button>
    );
  } else if (canShowViewAll && viewAllHref) {
    headingCta = (
      <HubSectionCta
        label={labels.viewAll}
        href={viewAllHref}
        className="profile-media-box__all"
      />
    );
  }

  if (items.length === 0 && !(alwaysShow && variant === "instagram")) {
    return null;
  }

  return (
    <>
      <section className="city-page__section profile-media-gallery-section" aria-labelledby={headingId}>
        <div className="city-page__hub-photo-gallery profile-media-box">
          {hideHeading ? null : (
            <div className="profile-media-box__head">
              <h2 id={headingId} className="profile-media-box__title">
                {heading}
              </h2>
              {headingCta}
            </div>
          )}
          {items.length > 0 ? (
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
                    photoAnchorPrefix={photoAnchorPrefix}
                  />
                </li>
              ))}
            </ul>
          ) : emptyLabel ? (
            <p className="city-page__empty">{emptyLabel}</p>
          ) : null}
        </div>
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
