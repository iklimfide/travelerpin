import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProfileAllDestinationsView } from "@/components/profile/ProfileAllDestinationsView";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { buildProfileAllDestinations } from "@/lib/utils/profile-all-destinations";
import { DEFAULT_DESCRIPTION, profileAllPath } from "@/lib/seo/site";
import { loadDemoPublicProfilePage } from "@/lib/data/jennifer-demo-page";
import { loadPublicProfilePage } from "@/lib/supabase/profile-page-data";

type PageProps = {
  params: Promise<{ username: string }>;
};

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const data = (await loadPublicProfilePage(username)) ?? (await loadDemoPublicProfilePage(username));

  if (!data) {
    return { title: "Traveler not found" };
  }

  const displayName = resolveProfileDisplayName(
    data.profile.display_name,
    data.profile.username
  );

  return {
    title: `${displayName} — All destinations`,
    description: DEFAULT_DESCRIPTION,
    alternates: {
      canonical: profileAllPath(data.profile.username),
    },
  };
}

export default async function ProfileAllDestinationsPage({ params }: PageProps) {
  const { username } = await params;
  const data = (await loadPublicProfilePage(username)) ?? (await loadDemoPublicProfilePage(username));

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

  const destinations = buildProfileAllDestinations(
    data.visitedCountries,
    data.visitedCities,
    data.visitedParks,
    visibleWishlistCountries,
    data.visitedCodes,
    profile.residence
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
    />
  );

  return view;
}
