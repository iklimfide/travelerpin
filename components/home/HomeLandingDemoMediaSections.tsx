"use client";

import { useEffect, useMemo, useState } from "react";
import { ProfileMediaSections } from "@/components/profile/ProfileMediaSections";
import { fetchHeroImageMaps } from "@/lib/client/hero-images-cache";
import { buildJenniferProfileMediaPins } from "@/lib/data/jennifer-demo-media";
import { useTranslateCommon, useTranslateProfile } from "@/lib/i18n/client-messages";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";

type HomeLandingDemoMediaSectionsProps = {
  data: PublicProfilePageData;
  displayName: string;
  isOwnProfile: boolean;
};

export function HomeLandingDemoMediaSections({
  data,
  displayName,
  isOwnProfile,
}: HomeLandingDemoMediaSectionsProps) {
  const t = useTranslateProfile();
  const tCommon = useTranslateCommon();
  const [cityHeroImages, setCityHeroImages] = useState<Map<string, string>>(() => new Map());
  const [parkHeroImages, setParkHeroImages] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    void fetchHeroImageMaps()
      .then(({ cityHeroImages: cityMap, parkHeroImages: parkMap }) => {
        if (cancelled) return;
        setCityHeroImages(cityMap);
        setParkHeroImages(parkMap);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const memoryPins = useMemo(
    () =>
      buildJenniferProfileMediaPins(
        data.visitedCities,
        data.visitedParks,
        data.profile,
        cityHeroImages,
        parkHeroImages
      ),
    [cityHeroImages, data.profile, data.visitedCities, data.visitedParks, parkHeroImages]
  );

  return (
    <div className="home-landing-media-sections">
      <ProfileMediaSections
        sections="photos"
        displayName={displayName}
        memoryPins={memoryPins}
        isOwnProfile={isOwnProfile}
        visitedCountries={data.visitedCountries}
        visitedCities={data.visitedCities}
        visitedParks={data.visitedParks}
        labels={{
          photosHeading: isOwnProfile
            ? t("myPhotos")
            : t("visitorPhotos", { name: displayName }),
          instagramHeading: isOwnProfile
            ? t("myInstagramLinks")
            : t("visitorInstagramLinks", { name: displayName }),
          noPhotosYet: isOwnProfile
            ? t("noPhotosYet")
            : t("visitorNoPhotosYet", { name: displayName }),
          noInstagramYet: isOwnProfile
            ? t("noInstagramYet")
            : t("visitorNoInstagramYet", { name: displayName }),
          viewPin: t("viewPin"),
          viewMap: t("viewMap"),
          close: t("closePin"),
          instagramPost: t("instagramPost"),
          viewAll: t("allDestinationsAll"),
          editMedia: tCommon("edit"),
          removeMedia: tCommon("delete"),
          removePhotoTitle: t("removePhotoTitle"),
          removePhotoMessage: t("removePhotoMessage"),
          removeInstagramTitle: t("removeInstagramTitle"),
          removeInstagramMessage: t("removeInstagramMessage"),
        }}
      />
    </div>
  );
}
