import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BRAND } from "@/lib/constants";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { buildProfileDescription } from "@/lib/seo/profile";
import { mapTitleOwnerName } from "@/lib/i18n/turkish-genitive";
import {
  staticOpenGraphImages,
  staticTwitterImages,
} from "@/lib/seo/og";
import {
  profilePath,
  profileUrl as buildProfileUrl,
  getSiteUrl,
} from "@/lib/seo/site";
import { loadPublicProfileMetadata } from "@/lib/supabase/profile-page-data";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

/**
 * OG / link-preview locale follows the profile owner's saved preference
 * (`profiles.locale`), not the scraper's Accept-Language or cookies.
 * WhatsApp and similar bots hit unprefixed `/username` without NEXT_LOCALE.
 */
export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { username } = await params;
  const data = await loadPublicProfileMetadata(username);

  if (!data) {
    return { title: "Traveler not found" };
  }

  const { profile, stats } = data;
  const locale: Locale =
    isLocale(profile.locale) ? profile.locale : defaultLocale;
  const tShare = await getTranslations({ locale, namespace: "share" });
  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
  const mapOwnerName = mapTitleOwnerName(displayName, locale);
  const title = tShare("pageTitle", { name: mapOwnerName });
  const shareTitle = tShare("ogTitle", { name: displayName });
  const ogDescription = tShare("ogDescription");
  const description = buildProfileDescription(displayName, stats, {
    captionOwn: tShare("captionOwn"),
    captionGuest: tShare("captionGuest", { name: displayName }),
    captionDescription: tShare("captionDescription"),
  });

  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    alternates: {
      canonical: profilePath(profile.username, locale),
    },
    openGraph: {
      type: "website",
      locale: locale === "tr" ? "tr_TR" : "en_US",
      title: shareTitle,
      description: ogDescription,
      url: buildProfileUrl(profile.username, locale),
      siteName: BRAND.name,
      images: staticOpenGraphImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: ogDescription,
      images: staticTwitterImages(),
    },
  };
}

export default function PublicProfileLayout({ children }: LayoutProps) {
  return children;
}
