"use client";

import { useState } from "react";
import { HubRecentTravelers } from "@/components/hub/HubRecentTravelers";
import { HubSectionCta } from "@/components/hub/HubSectionCta";
import { HubTravelerPictures } from "@/components/hub/HubTravelerPictures";
import { ProfileDestinationEditModal } from "@/components/profile/ProfileDestinationEditModal";
import { ProfileMediaListModal } from "@/components/profile/ProfileMediaListModal";
import { useTranslateProfile } from "@/lib/i18n/client-messages";
import type { CountryTraveler } from "@/lib/supabase/country-travelers";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
import {
  PROFILE_MEDIA_PREVIEW_LIMIT,
  splitProfileMediaItems,
} from "@/lib/utils/profile-media";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

type HubMediaTab = "photos" | "instagram";

type HubPageListingSectionsLabels = {
  recentTravelers: string;
  noTravelersYet: string;
  wantTravelers: string;
  noWantTravelersYet: string;
  pinCta: string;
  pinItTooCta: string;
  photosHeading: string;
  instagramHeading: string;
  noInstagramPostsYet: string;
  noPhotosYet: string;
  addYourPhotoCta: string;
  addYourInstagramCta: string;
  viewPin: string;
  viewMap: string;
  close: string;
  instagramPost: string;
};

type HubPageListingSectionsProps = {
  hubName: string;
  travelers: CountryTraveler[];
  wishlistTravelers?: CountryTraveler[];
  memoryPins: HubTravelerPin[];
  loginHref: string;
  isLoggedIn: boolean;
  hasOwnerPin: boolean;
  canEditMedia: boolean;
  visitedCountries: VisitedCountry[];
  ownerCity?: VisitedCity | null;
  ownerPark?: VisitedPark | null;
  travelersLayout?: "list" | "row";
  headingIds: {
    travelers: string;
    wishlist: string;
    photos: string;
    instagram: string;
  };
  labels: HubPageListingSectionsLabels;
};

function mediaHeadingCta(
  label: string,
  hasOwnerPin: boolean,
  isLoggedIn: boolean,
  loginHref: string,
  onOpenEdit: () => void
) {
  if (hasOwnerPin) {
    return <HubSectionCta label={label} onClick={onOpenEdit} />;
  }
  if (!isLoggedIn) {
    return <HubSectionCta label={label} href={loginHref} />;
  }
  return <HubSectionCta label={label} static />;
}

function pinItHeadingCta(
  label: string,
  hasOwnerPin: boolean,
  isLoggedIn: boolean,
  loginHref: string
) {
  if (hasOwnerPin) return null;
  if (!isLoggedIn) {
    return <HubSectionCta label={label} href={loginHref} />;
  }
  return <HubSectionCta label={label} static />;
}

export function HubPageListingSections({
  hubName,
  travelers,
  wishlistTravelers = [],
  memoryPins,
  loginHref,
  isLoggedIn,
  hasOwnerPin,
  canEditMedia,
  visitedCountries,
  ownerCity = null,
  ownerPark = null,
  travelersLayout = "row",
  headingIds,
  labels,
}: HubPageListingSectionsProps) {
  const tProfile = useTranslateProfile();
  const [editOpen, setEditOpen] = useState(false);
  const [editMediaFocus, setEditMediaFocus] = useState<"photo" | "instagram" | undefined>();
  const [openModalTab, setOpenModalTab] = useState<HubMediaTab | null>(null);
  const canOpenEdit = canEditMedia && (ownerCity || ownerPark);

  const { photos, instagram } = splitProfileMediaItems(memoryPins);
  const previewPhotos = photos.slice(0, PROFILE_MEDIA_PREVIEW_LIMIT);
  const previewInstagram = instagram.slice(0, PROFILE_MEDIA_PREVIEW_LIMIT);
  const viewAllLabel = tProfile("allDestinationsAll");

  function openEditModal(mediaFocus?: "photo" | "instagram") {
    setEditMediaFocus(mediaFocus);
    setEditOpen(true);
  }

  function closeEditModal() {
    setEditOpen(false);
    setEditMediaFocus(undefined);
  }

  const pictureLabels = {
    photosHeading: labels.photosHeading,
    instagramHeading: labels.instagramHeading,
    viewPin: labels.viewPin,
    viewMap: labels.viewMap,
    close: labels.close,
    instagramPost: labels.instagramPost,
  };

  const modalTitles: Record<HubMediaTab, string> = {
    photos: labels.photosHeading,
    instagram: labels.instagramHeading,
  };

  return (
    <>
      {editOpen && canOpenEdit ? (
        <ProfileDestinationEditModal
          city={ownerCity}
          park={ownerPark}
          visitedCountries={visitedCountries}
          mediaFocus={editMediaFocus}
          onClose={closeEditModal}
        />
      ) : null}

      <HubRecentTravelers
        travelers={travelers}
        headingId={headingIds.travelers}
        layout={travelersLayout}
        headingCta={pinItHeadingCta(
          labels.pinItTooCta,
          hasOwnerPin,
          isLoggedIn,
          loginHref
        )}
        labels={{
          recentTravelers: labels.recentTravelers,
          noTravelersYet: labels.noTravelersYet,
          pinCta: labels.pinCta,
        }}
      />

      <HubRecentTravelers
        travelers={wishlistTravelers}
        headingId={headingIds.wishlist}
        layout={travelersLayout}
        labels={{
          recentTravelers: labels.wantTravelers,
          noTravelersYet: labels.noWantTravelersYet,
          pinCta: "",
        }}
      />

      <HubTravelerPictures
        hubName={hubName}
        variant="photos"
        headingId={headingIds.photos}
        alwaysShow
        emptyLabel={labels.noPhotosYet}
        items={previewPhotos}
        showViewAll={photos.length > 0}
        viewAllLabel={viewAllLabel}
        onViewAll={() => setOpenModalTab("photos")}
        headingCta={mediaHeadingCta(
          labels.addYourPhotoCta,
          canEditMedia,
          isLoggedIn,
          loginHref,
          () => openEditModal("photo")
        )}
        labels={pictureLabels}
      />

      <HubTravelerPictures
        hubName={hubName}
        variant="instagram"
        headingId={headingIds.instagram}
        alwaysShow
        emptyLabel={labels.noInstagramPostsYet}
        items={previewInstagram}
        showViewAll={instagram.length > 0}
        viewAllLabel={viewAllLabel}
        onViewAll={() => setOpenModalTab("instagram")}
        headingCta={mediaHeadingCta(
          labels.addYourInstagramCta,
          canEditMedia,
          isLoggedIn,
          loginHref,
          () => openEditModal("instagram")
        )}
        labels={pictureLabels}
      />

      <ProfileMediaListModal
        open={openModalTab !== null}
        title={openModalTab ? modalTitles[openModalTab] : ""}
        onClose={() => setOpenModalTab(null)}
      >
        {openModalTab === "photos" ? (
          <div className="profile-media-list-modal__content">
            <HubTravelerPictures
              hubName={hubName}
              variant="photos"
              headingId="hub-media-modal-photos-heading"
              hideHeading
              items={photos}
              alwaysShow
              emptyLabel={labels.noPhotosYet}
              labels={pictureLabels}
            />
          </div>
        ) : null}
        {openModalTab === "instagram" ? (
          <div className="profile-media-list-modal__content">
            <HubTravelerPictures
              hubName={hubName}
              variant="instagram"
              headingId="hub-media-modal-instagram-heading"
              hideHeading
              items={instagram}
              alwaysShow
              emptyLabel={labels.noInstagramPostsYet}
              labels={pictureLabels}
            />
          </div>
        ) : null}
      </ProfileMediaListModal>
    </>
  );
}
