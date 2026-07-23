"use client";

import { useState } from "react";
import { ProfileMediaGallery } from "@/components/profile/ProfileMediaGallery";
import { ProfileMediaListModal } from "@/components/profile/ProfileMediaListModal";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
import {
  PROFILE_MEDIA_PREVIEW_LIMIT,
  splitProfileMediaItems,
} from "@/lib/utils/profile-media";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

type ProfileMediaTab = "photos" | "instagram";

type ProfileMediaSectionsProps = {
  displayName: string;
  memoryPins: HubTravelerPin[];
  isOwnProfile: boolean;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  /** Default: both galleries. Homepage splits photos (left) and Instagram (right). */
  sections?: "both" | "photos" | "instagram";
  labels: {
    photosHeading: string;
    instagramHeading: string;
    noPhotosYet: string;
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
};

export function ProfileMediaSections({
  displayName,
  memoryPins,
  isOwnProfile,
  visitedCountries,
  visitedCities,
  visitedParks,
  sections = "both",
  labels,
}: ProfileMediaSectionsProps) {
  const showPhotos = sections === "both" || sections === "photos";
  const showInstagram = sections === "both" || sections === "instagram";
  const { photos, instagram } = splitProfileMediaItems(memoryPins);
  const previewPhotos = photos.slice(0, PROFILE_MEDIA_PREVIEW_LIMIT);
  const previewInstagram = instagram.slice(0, PROFILE_MEDIA_PREVIEW_LIMIT);
  const [openModalTab, setOpenModalTab] = useState<ProfileMediaTab | null>(null);

  const modalTitles: Record<ProfileMediaTab, string> = {
    photos: labels.photosHeading,
    instagram: labels.instagramHeading,
  };

  function renderModalGallery(tab: ProfileMediaTab) {
    const isPhotos = tab === "photos";
    const items = isPhotos ? photos : instagram;

    return (
      <div className="profile-media-sections profile-media-list-modal__content">
        <ProfileMediaGallery
          hubName={displayName}
          variant={tab}
          headingId={isPhotos ? "profile-media-modal-photos-heading" : "profile-media-modal-instagram-heading"}
          hideHeading
          items={items}
          alwaysShow
          emptyLabel={isPhotos ? labels.noPhotosYet : labels.noInstagramYet}
          isOwnProfile={isOwnProfile}
          visitedCountries={visitedCountries}
          visitedCities={visitedCities}
          visitedParks={visitedParks}
          labels={labels}
        />
      </div>
    );
  }

  return (
    <>
      <div className="profile-media-sections">
        {showPhotos ? (
          <ProfileMediaGallery
            hubName={displayName}
            variant="photos"
            headingId="profile-photos-heading"
            alwaysShow
            emptyLabel={labels.noPhotosYet}
            items={previewPhotos}
            onViewAll={() => setOpenModalTab("photos")}
            showViewAll={photos.length > 0}
            showAddButton
            isOwnProfile={isOwnProfile}
            visitedCountries={visitedCountries}
            visitedCities={visitedCities}
            visitedParks={visitedParks}
            labels={labels}
          />
        ) : null}

        {showInstagram ? (
          <ProfileMediaGallery
            hubName={displayName}
            variant="instagram"
            headingId="profile-instagram-heading"
            alwaysShow
            emptyLabel={labels.noInstagramYet}
            items={previewInstagram}
            onViewAll={() => setOpenModalTab("instagram")}
            showViewAll={instagram.length > 0}
            showAddButton
            isOwnProfile={isOwnProfile}
            visitedCountries={visitedCountries}
            visitedCities={visitedCities}
            visitedParks={visitedParks}
            labels={labels}
          />
        ) : null}
      </div>

      <ProfileMediaListModal
        open={openModalTab !== null}
        title={openModalTab ? modalTitles[openModalTab] : ""}
        onClose={() => setOpenModalTab(null)}
      >
        {openModalTab ? renderModalGallery(openModalTab) : null}
      </ProfileMediaListModal>
    </>
  );
}
