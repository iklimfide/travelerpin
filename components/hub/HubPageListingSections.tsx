"use client";

import { useState } from "react";
import { HubRecentTravelers } from "@/components/hub/HubRecentTravelers";
import { HubSectionCta } from "@/components/hub/HubSectionCta";
import { HubTravelerPictures } from "@/components/hub/HubTravelerPictures";
import { ProfileDestinationEditModal } from "@/components/profile/ProfileDestinationEditModal";
import { pinHasInstagramMedia, pinHasPhotoMedia } from "@/lib/supabase/hub-traveler-pin";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
import type { CountryTraveler } from "@/lib/supabase/country-travelers";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

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
  const [editOpen, setEditOpen] = useState(false);
  const [editMediaFocus, setEditMediaFocus] = useState<"photo" | "instagram" | undefined>();
  const canOpenEdit = canEditMedia && (ownerCity || ownerPark);

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
        headingCta={mediaHeadingCta(
          labels.addYourPhotoCta,
          canEditMedia,
          isLoggedIn,
          loginHref,
          () => openEditModal("photo")
        )}
        pins={memoryPins.filter((pin) => pinHasPhotoMedia(pin))}
        labels={pictureLabels}
      />

      <HubTravelerPictures
        hubName={hubName}
        variant="instagram"
        headingId={headingIds.instagram}
        alwaysShow
        emptyLabel={labels.noInstagramPostsYet}
        headingCta={mediaHeadingCta(
          labels.addYourInstagramCta,
          canEditMedia,
          isLoggedIn,
          loginHref,
          () => openEditModal("instagram")
        )}
        pins={memoryPins.filter((pin) => pinHasInstagramMedia(pin))}
        labels={pictureLabels}
      />
    </>
  );
}
