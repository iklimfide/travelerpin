import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ProfileAllDestinationsView } from "@/components/profile/ProfileAllDestinationsView";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { getCachedCityHeroImageMap } from "@/lib/city/city-hero-images";
import { buildProfileAllDestinations } from "@/lib/utils/profile-all-destinations";
import { parseNextRoute } from "@/lib/utils/next-route";
import { DEFAULT_DESCRIPTION, profileAllPath } from "@/lib/seo/site";
import {
  applyPublicPreviewToProfileData,
  filterWishlistForProfileView,
  isProfilePublicPreview,
} from "@/lib/profile/public-preview";
import { loadPublicProfilePage } from "@/lib/supabase/profile-page-data";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { mapTitleOwnerName } from "@/lib/i18n/turkish-genitive";
import { ProfilePublicPreviewBanner } from "@/components/profile/ProfilePublicPreviewBanner";

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ view?: string }>;
};

export const revalidate = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const tShare = await getTranslations("share");
  const data = await loadPublicProfilePage(username);

  if (!data) {
    return { title: "Traveler not found" };
  }

  const displayName = resolveProfileDisplayName(
    data.profile.display_name,
    data.profile.username
  );
  const localeRaw = await getLocale();
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";

  return {
    title: tShare("pageTitle", { name: mapTitleOwnerName(displayName, locale) }),
    description: DEFAULT_DESCRIPTION,
    alternates: {
      canonical: profileAllPath(data.profile.username, locale),
    },
  };
}

export default async function ProfileAllDestinationsPage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const query = await searchParams;
  const locale = (await getLocale()) === "tr" ? "tr" : "en";
  const data = await loadPublicProfilePage(username);

  if (!data) {
    notFound();
  }

  const { profile, currentUsername } = data;
  const isAccountOwner =
    currentUsername != null &&
    currentUsername.toLowerCase() === profile.username.toLowerCase();
  const previewAsPublic = isAccountOwner && isProfilePublicPreview(query);
  const isOwnProfile = isAccountOwner && !previewAsPublic;
  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
  const viewData = previewAsPublic ? applyPublicPreviewToProfileData(data) : data;
  const { wishlistCountries: visibleWishlistCountries, wishlistCodes: visibleWishlistCodes } =
    filterWishlistForProfileView(viewData, isOwnProfile);

  const cityHeroImages = await getCachedCityHeroImageMap();
  const destinations = buildProfileAllDestinations(
    viewData.visitedCountries,
    viewData.visitedCities,
    viewData.visitedParks,
    visibleWishlistCountries,
    viewData.visitedCodes,
    profile.residence,
    locale,
    cityHeroImages
  );

  return (
    <>
      {previewAsPublic ? <ProfilePublicPreviewBanner username={profile.username} /> : null}
      <ProfileAllDestinationsView
        username={profile.username}
        displayName={displayName}
        isOwnProfile={isOwnProfile}
        previewAsPublic={previewAsPublic}
        destinations={destinations}
        visitedCountries={viewData.visitedCountries}
        visitedCities={viewData.visitedCities}
        visitedParks={viewData.visitedParks}
        visitedCodes={viewData.visitedCodes}
        wishlistCodes={visibleWishlistCodes}
        wishlistCountries={visibleWishlistCountries}
        isLoggedIn={viewData.isLoggedIn}
        stats={viewData.stats}
        initialNextRouteStops={parseNextRoute(profile.next_route)}
      />
    </>
  );
}
