import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileOwnerTools } from "@/components/dashboard/ProfileOwnerTools";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { BRAND } from "@/lib/constants";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import {
  buildProfileDescription,
  buildProfileOgDescription,
  buildProfileOgTitle,
} from "@/lib/seo/profile";
import {
  OG_IMAGE_SIZE,
  profileOgImageAlt,
  profileOgImageUrl,
  profileOgImageVersion,
} from "@/lib/seo/og";
import {
  profilePath,
  travelMapTitle,
  profileUrl as buildProfileUrl,
  getSiteUrl,
} from "@/lib/seo/site";
import { loadPublicProfilePage } from "@/lib/supabase/profile-page-data";

type PageProps = {
  params: Promise<{ username: string }>;
};

// Pin/map data is tag-cached indefinitely; busted on pin/profile writes.
export const revalidate = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await loadPublicProfilePage(username);

  if (!data) {
    return { title: "Traveler not found" };
  }

  const { profile, stats } = data;
  const visitedCount = data.visitedCodes.length;
  const wishlistCount = data.wishlistCodes.length;
  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
  const isOwnProfile = data.currentUsername === profile.username;
  const title = travelMapTitle(displayName);
  const ogTitle = buildProfileOgTitle(displayName);
  const ogDescription = buildProfileOgDescription();
  const url = buildProfileUrl(profile.username);
  const ogVersion = profileOgImageVersion(stats, visitedCount, wishlistCount);
  const ogImageUrl = profileOgImageUrl(profile.username, ogVersion);

  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description: ogDescription,
    alternates: {
      canonical: profilePath(profile.username),
    },
    openGraph: {
      type: "website",
      title: ogTitle,
      description: ogDescription,
      url,
      siteName: BRAND.name,
      images: [
        {
          url: ogImageUrl,
          width: OG_IMAGE_SIZE.width,
          height: OG_IMAGE_SIZE.height,
          alt: profileOgImageAlt(displayName),
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImageUrl],
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const data = await loadPublicProfilePage(username);

  if (!data) {
    notFound();
  }

  const { profile, stats, currentUsername, isLoggedIn } = data;

  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
  const publicUrl = buildProfileUrl(profile.username);
  const profileDescription = buildProfileDescription(displayName, stats);
  const isOwnProfile = currentUsername === profile.username;
  const isGuest = !isLoggedIn;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${displayName} on ${BRAND.name}`,
    description: profileDescription,
    url: publicUrl,
    mainEntity: {
      "@type": "Person",
      name: displayName,
      alternateName: profile.username,
      url: publicUrl,
    },
  };

  const profileView = (
    <PublicProfileView
      data={data}
      profileDescription={profileDescription}
      isOwnProfile={isOwnProfile}
      isGuest={isGuest}
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
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {profileView}
    </>
  );
}
