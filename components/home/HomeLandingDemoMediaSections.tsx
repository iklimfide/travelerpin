import { ProfileMediaSections } from "@/components/profile/ProfileMediaSections";
import { buildProfileMediaPins } from "@/lib/utils/profile-media";
import { getTranslations } from "next-intl/server";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";

type HomeLandingDemoMediaSectionsProps = {
  data: PublicProfilePageData;
  displayName: string;
  isOwnProfile: boolean;
};

export async function HomeLandingDemoMediaSections({
  data,
  displayName,
  isOwnProfile,
}: HomeLandingDemoMediaSectionsProps) {
  const [t, tCommon] = await Promise.all([getTranslations("profile"), getTranslations("common")]);
  const memoryPins = buildProfileMediaPins(data.visitedCities, data.visitedParks, data.profile);

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
