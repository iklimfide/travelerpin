import type { TravelStats } from "@/types/database";
import { BRAND } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo/site";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export const OG_IMAGE_LAYOUT_VERSION = 7;

export function profileOgImageVersion(
  stats: TravelStats,
  visitedCount: number,
  wishlistCount: number
): string {
  return `${OG_IMAGE_LAYOUT_VERSION}.${stats.countries}.${stats.cities}.${visitedCount}.${wishlistCount}`;
}

export function profileOgImagePath(username: string, version?: string): string {
  const path = `/og/u/${username.toLowerCase()}`;
  if (!version) return path;
  return `${path}?v=${encodeURIComponent(version)}`;
}

export function profileOgImageUrl(username: string, version?: string): string {
  return `${getSiteUrl()}${profileOgImagePath(username, version)}`;
}

export function profileOgImageAlt(displayName: string): string {
  return `${displayName}'s travel map on ${BRAND.name}`;
}
