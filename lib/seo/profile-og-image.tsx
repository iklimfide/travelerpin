import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { BRAND } from "@/lib/constants";
import { ProfileCardOgLayout } from "@/lib/seo/profile-card-og-layout";
import { getOgAssetOrigin } from "@/lib/seo/og-asset-origin";
import { loadProxiedOgImageDataUrl } from "@/lib/seo/og-image-proxy-load";
import { buildProfileDescription } from "@/lib/seo/profile";
import { OG_IMAGE_SIZE } from "@/lib/seo/og";
import { getSiteUrl } from "@/lib/seo/site";
import { getCachedPublicProfileBundle } from "@/lib/supabase/profile-page-data";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { computeTravelStats } from "@/lib/utils/stats";
import type { TravelStats } from "@/types/database";

function absoluteAssetUrl(url: string | null, siteUrl: string): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${siteUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

function ogCardDescription(displayName: string, stats: TravelStats, bio: string | null): string {
  const base = bio?.trim() || buildProfileDescription(displayName, stats);
  return base.replace(new RegExp(`${BRAND.name}\\.$`), `${BRAND.name}.com`);
}

export async function buildProfileOgImage(
  username: string,
  assetOrigin?: string
): Promise<ImageResponse> {
  const bundle = await getCachedPublicProfileBundle(username);
  if (!bundle) notFound();

  const { profile, visitedCountries, visitedCities, visitedParks } = bundle;
  const stats = computeTravelStats(visitedCountries, visitedCities, visitedParks);

  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
  const siteUrl = getSiteUrl();
  const imageOrigin = assetOrigin ?? (await getOgAssetOrigin());
  const avatarSource = absoluteAssetUrl(profile.avatar_url, siteUrl);

  const avatarUrl = await loadProxiedOgImageDataUrl(avatarSource, imageOrigin, {
    width: 224,
    height: 224,
  });

  const description = ogCardDescription(displayName, stats, profile.bio);
  const heroTitle = `${displayName}'s Travel Map`;

  return new ImageResponse(
    (
      <ProfileCardOgLayout
        displayName={displayName}
        avatarUrl={avatarUrl}
        heroTitle={heroTitle}
        description={description}
        stats={stats}
      />
    ),
    { ...OG_IMAGE_SIZE }
  );
}
