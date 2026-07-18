"use client";

import { ProfileMediaGallery } from "@/components/profile/ProfileMediaGallery";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";
import { profileMediaPath } from "@/lib/seo/site";
import {
  PROFILE_MEDIA_PREVIEW_LIMIT,
  splitProfileMediaItems,
} from "@/lib/utils/profile-media";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

type ProfileMediaSectionsProps = {
  username: string;
  displayName: string;
  memoryPins: HubTravelerPin[];
  isOwnProfile: boolean;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
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
  username,
  displayName,
  memoryPins,
  isOwnProfile,
  visitedCountries,
  visitedCities,
  visitedParks,
  labels,
}: ProfileMediaSectionsProps) {
  const { photos, instagram } = splitProfileMediaItems(memoryPins);
  const previewPhotos = photos.slice(0, PROFILE_MEDIA_PREVIEW_LIMIT);
  const previewInstagram = instagram.slice(0, PROFILE_MEDIA_PREVIEW_LIMIT);

  return (
    <div className="profile-media-sections">
      <ProfileMediaGallery
        hubName={displayName}
        variant="photos"
        headingId="profile-photos-heading"
        alwaysShow
        emptyLabel={labels.noPhotosYet}
        items={previewPhotos}
        viewAllHref={
          previewPhotos.length > 0 ? profileMediaPath(username, "photos") : undefined
        }
        showAddButton
        isOwnProfile={isOwnProfile}
        visitedCountries={visitedCountries}
        visitedCities={visitedCities}
        visitedParks={visitedParks}
        labels={labels}
      />

      <ProfileMediaGallery
        hubName={displayName}
        variant="instagram"
        headingId="profile-instagram-heading"
        alwaysShow
        emptyLabel={labels.noInstagramYet}
        items={previewInstagram}
        viewAllHref={
          previewInstagram.length > 0 ? profileMediaPath(username, "instagram") : undefined
        }
        showAddButton
        isOwnProfile={isOwnProfile}
        visitedCountries={visitedCountries}
        visitedCities={visitedCities}
        visitedParks={visitedParks}
        labels={labels}
      />
    </div>
  );
}
