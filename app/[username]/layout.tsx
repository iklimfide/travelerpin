import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { buildProfileDescription } from "@/lib/seo/profile";
import {
  PIN_MAP_OG_DESCRIPTION,
  profilePinMapShareTitle,
  staticOpenGraphImages,
  staticTwitterImages,
} from "@/lib/seo/og";
import {
  profilePath,
  travelMapTitle,
  profileUrl as buildProfileUrl,
  getSiteUrl,
} from "@/lib/seo/site";
import { loadPublicProfileMetadata } from "@/lib/supabase/profile-page-data";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { username } = await params;
  const data = await loadPublicProfileMetadata(username);

  if (!data) {
    return { title: "Traveler not found" };
  }

  const { profile, stats } = data;
  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
  const title = travelMapTitle(displayName);
  const shareTitle = profilePinMapShareTitle(displayName);
  const description = buildProfileDescription(displayName, stats);

  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    alternates: {
      canonical: profilePath(profile.username),
    },
    openGraph: {
      type: "website",
      title: shareTitle,
      description: PIN_MAP_OG_DESCRIPTION,
      url: buildProfileUrl(profile.username),
      siteName: BRAND.name,
      images: staticOpenGraphImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: PIN_MAP_OG_DESCRIPTION,
      images: staticTwitterImages(),
    },
  };
}

export default function PublicProfileLayout({ children }: LayoutProps) {
  return children;
}
