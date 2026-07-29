"use client";

import { useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { ProfileInstagramLinkCard } from "@/components/profile/ProfileInstagramLinkCard";
import { HubExternalPhoto } from "@/components/hub/HubExternalPhoto";
import { HubMediaThumbFrame } from "@/components/hub/HubMediaThumbFrame";
import { HubMemoryLightbox } from "@/components/hub/HubMemoryLightbox";
import { HubSectionCta } from "@/components/hub/HubSectionCta";
import { ProfileDestinationEditModal } from "@/components/profile/ProfileDestinationEditModal";
import { useModal } from "@/components/ui/ModalProvider";
import { useAppMessages } from "@/lib/i18n/client-messages";
import {
  removeCityInstagramUrl,
  removeCityPhoto,
  removeParkInstagramUrl,
  removeParkPhoto,
} from "@/lib/client/profile-media-update";
import { notifyProfileDataChanged } from "@/lib/client/session-page-cache";
import { refreshTravelStateAfterSave } from "@/lib/client/travel-state";
import type { HubGalleryItem, HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
import { getCountryName } from "@/lib/data/countries";
import type { Locale } from "@/lib/i18n/config";
import { getLocalizedCityName } from "@/lib/i18n/place-names";
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
  /** Owner-only Add button in the heading (opens a pin picker, then the edit form). */
  showAddButton?: boolean;
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
  const { modal: modalMessages } = useAppMessages();
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

function MediaPlaceCaption({ pin }: { pin: HubTravelerPin }) {
  const label = pin.placeLabel?.trim();
  if (!label) return null;

  if (pin.placePath) {
    return (
      <Link href={pin.placePath} className="profile-media-item__place" prefetch={false}>
        {label}
      </Link>
    );
  }

  return <span className="profile-media-item__place profile-media-item__place--static">{label}</span>;
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

  const anchorId =
    photoAnchorPrefix && item.mediaType === "photo"
      ? `${photoAnchorPrefix}${item.id}`
      : undefined;

  let media: ReactNode;

  if (item.mediaType === "instagram") {
    const instagramHref = normalizeInstagramPostUrl(item.mediaUrl);
    media = (
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
  } else {
    const photoSrc = hubGalleryPhotoSrc(item);
    media = (
      <HubMediaThumbFrame pin={item.pin}>
        <button
          type="button"
          className="city-page__traveler-picture-btn profile-media-item__link"
          onClick={() => onSelect(item)}
          aria-label={`${labels.viewPin} — ${item.pin.displayName} — ${item.pin.placeLabel}`}
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
      </HubMediaThumbFrame>
    );
  }

  return (
    <div className="profile-media-item" id={anchorId}>
      <div className="profile-media-item__media">
        {media}
        {ownerActions}
      </div>
      <MediaPlaceCaption pin={item.pin} />
    </div>
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
  showAddButton = false,
  isOwnProfile,
  visitedCountries,
  visitedCities,
  visitedParks,
  labels,
  photoAnchorPrefix,
}: ProfileMediaGalleryProps) {
  const { modal: modalMessages, profile: profileMessages } = useAppMessages();
  const locale = useLocale() as Locale;
  const modal = useModal();
  const [expandedItem, setExpandedItem] = useState<HubGalleryItem | null>(null);
  const [editModalCity, setEditModalCity] = useState<VisitedCity | null>(null);
  const [editModalPark, setEditModalPark] = useState<VisitedPark | null>(null);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [addPickerQuery, setAddPickerQuery] = useState("");
  const [addPickerEntries, setAddPickerEntries] = useState<
    Array<{
      kind: "city" | "park";
      id: string;
      name: string;
      rawName: string;
      countryName: string;
      rawCountryName: string;
    }>
  >([]);
  const [editMediaFocus, setEditMediaFocus] = useState<"photo" | "instagram" | undefined>(
    undefined
  );

  const heading = variant === "photos" ? labels.photosHeading : labels.instagramHeading;

  function buildPickerEntries(
    cities: VisitedCity[],
    parks: VisitedPark[]
  ): typeof addPickerEntries {
    const pickerCityEntries = cities.map((city) => ({
      kind: "city" as const,
      id: city.id,
      name: getLocalizedCityName(city.country_code, city.city_name, locale),
      rawName: city.city_name,
      countryName: getCountryName(city.country_code, locale),
      rawCountryName: city.country_name,
    }));
    const pickerParkEntries = parks.map((park) => ({
      kind: "park" as const,
      id: park.id,
      name: park.park_name,
      rawName: park.park_name,
      countryName: getCountryName(park.country_code, locale),
      rawCountryName: park.country_name,
    }));
    return [...pickerCityEntries, ...pickerParkEntries];
  }

  function openEditForItem(item: HubGalleryItem) {
    const ref = parseProfilePinId(item.pin.id);
    if (!ref) return;

    setEditMediaFocus(undefined);

    if (ref.kind === "city") {
      setEditModalPark(null);
      setEditModalCity(visitedCities.find((city) => city.id === ref.id) ?? null);
      return;
    }

    setEditModalCity(null);
    setEditModalPark(visitedParks.find((park) => park.id === ref.id) ?? null);
  }

  const addMediaFocus = variant === "photos" ? "photo" : "instagram";

  function openAddPicker() {
    setAddPickerQuery("");
    setAddPickerEntries(buildPickerEntries(visitedCities, visitedParks));
    setAddPickerOpen(true);
  }

  const pickerFilter = addPickerQuery.trim().toLocaleLowerCase(locale);
  const pickerEntries = addPickerEntries.filter((entry) => {
    if (!pickerFilter) return true;
    return [entry.name, entry.rawName, entry.countryName, entry.rawCountryName].some(
      (value) => value.toLocaleLowerCase(locale).includes(pickerFilter)
    );
  });

  function openAddForPin(kind: "city" | "park", id: string) {
    setAddPickerOpen(false);
    setEditMediaFocus(addMediaFocus);
    if (kind === "city") {
      setEditModalPark(null);
      setEditModalCity(visitedCities.find((city) => city.id === id) ?? null);
      return;
    }
    setEditModalCity(null);
    setEditModalPark(visitedParks.find((park) => park.id === id) ?? null);
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
          ? await removeCityPhoto(city, item.mediaUrl)
          : await removeCityInstagramUrl(city, item.mediaUrl);
    } else {
      const park = visitedParks.find((entry) => entry.id === ref.id);
      if (!park) return;
      response =
        item.mediaType === "photo"
          ? await removeParkPhoto(park, item.mediaUrl)
          : await removeParkInstagramUrl(park, item.mediaUrl);
    }

    if (!response.ok) {
      const data = await response.json();
      await modal.alert(data.error ?? modalMessages.errorTitle, { variant: "error" });
      return;
    }

    notifyProfileDataChanged();
    refreshTravelStateAfterSave();
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
        className="profile-media-box__all profile-owner-section__btn"
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
        className="profile-media-box__all profile-owner-section__btn"
      />
    );
  }

  if (items.length === 0 && !alwaysShow) {
    return null;
  }

  return (
    <>
      <section className="city-page__section profile-media-gallery-section" aria-labelledby={headingId}>
        <div className="city-page__hub-photo-gallery profile-media-box">
          {hideHeading ? null : (
            <div className="profile-media-box__head profile-card-hero">
              <div className="profile-media-box__header">
                {showAddButton && isOwnProfile ? (
                  <div className="profile-media-box__header-action profile-media-box__header-action--start">
                    <button
                      type="button"
                      className="profile-owner-section__btn profile-owner-section__btn--add"
                      onClick={openAddPicker}
                    >
                      {profileMessages.ownerAdd}
                    </button>
                  </div>
                ) : null}
                <div className="profile-media-box__intro">
                  <h2 id={headingId} className="profile-media-box__title profile-card-hero__title">
                    {heading}
                  </h2>
                </div>
                {headingCta ? (
                  <div className="profile-media-box__header-action profile-media-box__header-action--end">
                    {headingCta}
                  </div>
                ) : null}
              </div>
            </div>
          )}
          <div className="profile-media-box__body">
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

      {addPickerOpen ? (
        <div className="profile-followers-modal profile-media-add-picker" role="presentation">
          <button
            type="button"
            className="profile-followers-modal__backdrop"
            aria-label={labels.close}
            onClick={() => setAddPickerOpen(false)}
          />
          <div
            className="profile-followers-modal__sheet profile-media-add-picker__sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-media-add-picker-title"
          >
            <div className="profile-destination-edit-modal__head">
              <h2
                id="profile-media-add-picker-title"
                className="profile-followers-modal__title"
              >
                {variant === "photos"
                  ? profileMessages.addMediaPhotoTitle
                  : profileMessages.addMediaInstagramTitle}
              </h2>
              <button
                type="button"
                className="profile-followers-modal__close"
                onClick={() => setAddPickerOpen(false)}
                aria-label={labels.close}
              >
                <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {visitedCities.length > 0 || visitedParks.length > 0 ? (
              <>
                <p className="profile-media-add-picker__hint">
                  {profileMessages.addMediaPickHint}
                </p>
                <div className="profile-media-add-picker__search">
                  <input
                    type="search"
                    value={addPickerQuery}
                    onChange={(event) => setAddPickerQuery(event.target.value)}
                    placeholder={profileMessages.addMediaSearchPlaceholder}
                    className="profile-media-add-picker__search-input"
                    autoFocus
                  />
                </div>
                {pickerEntries.length > 0 ? (
                  <ul className="profile-media-add-picker__list scrollbar-thin">
                    {pickerEntries.map((entry) => (
                      <li key={`${entry.kind}-${entry.id}`}>
                        <button
                          type="button"
                          className="profile-media-add-picker__item"
                          onClick={() => openAddForPin(entry.kind, entry.id)}
                        >
                          <span className="profile-media-add-picker__name">{entry.name}</span>
                          <span className="profile-media-add-picker__meta">
                            {entry.countryName}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="profile-media-add-picker__hint">
                    {profileMessages.addMediaSearchEmpty}
                  </p>
                )}
              </>
            ) : (
              <p className="profile-media-add-picker__hint">
                {profileMessages.addMediaNoPins}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {isOwnProfile ? (
        <ProfileDestinationEditModal
          city={editModalCity}
          park={editModalPark}
          visitedCountries={visitedCountries}
          visitedCities={visitedCities}
          mediaFocus={editMediaFocus}
          onClose={() => {
            setEditModalCity(null);
            setEditModalPark(null);
            setEditMediaFocus(undefined);
          }}
        />
      ) : null}
    </>
  );
}
