import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { BRAND } from "@/lib/constants";
import { ProfileCardOgLayout } from "@/lib/seo/profile-card-og-layout";
import { getOgAssetOrigin } from "@/lib/seo/og-asset-origin";
import { loadProxiedOgImageDataUrl } from "@/lib/seo/og-image-proxy-load";
import { buildProfileDescription } from "@/lib/seo/profile";
import { OG_IMAGE_SIZE } from "@/lib/seo/og";
import { getSiteUrl } from "@/lib/seo/site";
import { createClient } from "@/lib/supabase/server";
import { fetchPublicProfile } from "@/lib/supabase/public-profile";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { computeTravelStats } from "@/lib/utils/stats";
import type { TravelStats, VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

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
  const supabase = await createClient();
  if (!supabase) notFound();

  const profile = await fetchPublicProfile(supabase, username);
  if (!profile) notFound();

  const [{ data: countries }, { data: cities }, { data: parks }] = await Promise.all([
    supabase.from("visited_countries").select("*").eq("user_id", profile.id),
    supabase.from("visited_cities").select("*").eq("user_id", profile.id),
    supabase.from("visited_parks").select("*").eq("user_id", profile.id),
  ]);

  const visitedCountries = (countries ?? []) as VisitedCountry[];
  const visitedCities = (cities ?? []) as VisitedCity[];
  const visitedParks = (parks ?? []) as VisitedPark[];
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
