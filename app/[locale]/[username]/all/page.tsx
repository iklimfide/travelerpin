import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ProfileAllDestinationsView } from "@/components/profile/ProfileAllDestinationsView";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { getCachedCityHeroImageMap } from "@/lib/city/city-hero-images";
import { buildProfileAllDestinations } from "@/lib/utils/profile-all-destinations";
import { parseNextRoute } from "@/lib/utils/next-route";
import { DEFAULT_DESCRIPTION, profileAllPath } from "@/lib/seo/site";
import { loadPublicProfilePage } from "@/lib/supabase/profile-page-data";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { mapTitleOwnerName } from "@/lib/i18n/turkish-genitive";

type PageProps = {
  params: Promise<{ username: string }>;
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

export default async function ProfileAllDestinationsPage({ params }: PageProps) {
  const { username } = await params;
  const locale = (await getLocale()) === "tr" ? "tr" : "en";
  const data = await loadPublicProfilePage(username);

  if (!data) {
    notFound();
  }

  const { profile, currentUsername } = data;
  const isOwnProfile = currentUsername === profile.username;
  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
  const wishlistPublic = profile.wishlist_public;
  const visibleWishlistCountries =
    isOwnProfile || wishlistPublic ? data.wishlistCountries : [];
  const visibleWishlistCodes =
    isOwnProfile || wishlistPublic ? data.wishlistCodes : [];

  const cityHeroImages = await getCachedCityHeroImageMap();
  const destinations = buildProfileAllDestinations(
    data.visitedCountries,
    data.visitedCities,
    data.visitedParks,
    visibleWishlistCountries,
    data.visitedCodes,
    profile.residence,
    locale,
    cityHeroImages
  );

  const view = (
    <ProfileAllDestinationsView
      username={profile.username}
      displayName={displayName}
      isOwnProfile={isOwnProfile}
      destinations={destinations}
      visitedCountries={data.visitedCountries}
      visitedCities={data.visitedCities}
      visitedParks={data.visitedParks}
      visitedCodes={data.visitedCodes}
      wishlistCodes={visibleWishlistCodes}
      wishlistCountries={visibleWishlistCountries}
      isLoggedIn={data.isLoggedIn}
      stats={data.stats}
      initialNextRouteStops={parseNextRoute(profile.next_route)}
    />
  );

  return view;
}
