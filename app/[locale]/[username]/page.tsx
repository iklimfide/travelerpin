import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileJsonLd } from "@/components/profile/ProfileJsonLd";
import { ProfileOwnerTools } from "@/components/dashboard/ProfileOwnerTools";
import { ProfileServerBridge } from "@/components/profile/ProfileServerBridge";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { buildProfileDescription } from "@/lib/seo/profile";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import {
  applyPublicPreviewToProfileData,
  isProfilePublicPreview,
} from "@/lib/profile/public-preview";
import { loadPublicProfilePage } from "@/lib/supabase/profile-page-data";

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ view?: string }>;
};

export default async function PublicProfilePage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const query = await searchParams;
  const data = await loadPublicProfilePage(username);
  if (!data) notFound();

  const displayName = resolveProfileDisplayName(
    data.profile.display_name,
    data.profile.username
  );
  const locale: Locale = isLocale(data.profile.locale) ? data.profile.locale : defaultLocale;
  const tShare = await getTranslations({ locale, namespace: "share" });
  const profileDescription = buildProfileDescription(displayName, data.stats, {
    captionOwn: tShare("captionOwn"),
    captionGuest: tShare("captionGuest", { name: displayName }),
    captionDescription: tShare("captionDescription"),
  });

  const isAccountOwner =
    data.currentUsername != null &&
    data.currentUsername.toLowerCase() === data.profile.username.toLowerCase();
  const previewAsPublic = isAccountOwner && isProfilePublicPreview(query);
  const isOwnProfile = isAccountOwner && !previewAsPublic;
  const isGuest = !data.isLoggedIn;
  const viewData = previewAsPublic ? applyPublicPreviewToProfileData(data) : data;

  return (
    <>
      <ProfileJsonLd profile={data.profile} profileDescription={profileDescription} />
      <ProfileServerBridge
        username={data.profile.username}
        initialData={data}
        enableLiveRefresh={isOwnProfile}
      />
      <PublicProfileView
        data={viewData}
        profileDescription={profileDescription}
        isOwnProfile={isOwnProfile}
        isGuest={isGuest}
        previewAsPublic={previewAsPublic}
        ownerTools={
          isOwnProfile ? (
            <ProfileOwnerTools
              visitedCountries={data.visitedCountries}
              visitedCities={data.visitedCities}
              visitedParks={data.visitedParks}
              wishlistCountries={data.wishlistCountries}
              visitedCodes={data.visitedCodes}
            />
          ) : undefined
        }
      />
    </>
  );
}
