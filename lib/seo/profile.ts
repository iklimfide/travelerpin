import type { TravelStats } from "@/types/database";
import { BRAND } from "@/lib/constants";
import { DEFAULT_DESCRIPTION, profileShareUrl } from "@/lib/seo/site";

/** Open Graph / Twitter card title for public profile links. */
export function buildProfileOgTitle(displayName: string): string {
  return `${displayName} traveled and pinned the places they've visited`;
}

/** Open Graph / Twitter card description for public profile links. */
export function buildProfileOgDescription(): string {
  return DEFAULT_DESCRIPTION;
}

export function buildProfileTitle(
  displayName: string,
  username: string
): string {
  return displayName === username ? `@${username}` : `${displayName} (@${username})`;
}

export function buildProfileDescription(
  displayName: string,
  stats: TravelStats
): string {
  if (stats.countries === 0 && stats.cities === 0) {
    return `${displayName} is building a travel map on ${BRAND.name}. Explore countries and cities around the world.`;
  }

  const parts: string[] = [];
  if (stats.countries > 0) {
    parts.push(
      `${stats.countries} ${stats.countries === 1 ? "country" : "countries"}`
    );
  }
  if (stats.cities > 0) {
    parts.push(`${stats.cities} ${stats.cities === 1 ? "city" : "cities"}`);
  }

  const pinnedPhrase =
    parts.length === 2 ? parts.join(" and ") : (parts[0] ?? "");

  return `${displayName} has pinned ${pinnedPhrase}. Explore their personal travel map on ${BRAND.name}.`;
}

export function buildShareText(
  displayName: string,
  stats: TravelStats,
  username: string,
  options?: { url?: string; isOwnProfile?: boolean }
): string {
  const url = options?.url ?? profileShareUrl(username);
  const isOwnProfile = options?.isOwnProfile ?? true;

  if (stats.countries === 0 && stats.cities === 0) {
    return isOwnProfile
      ? `Follow my travel journey on ${BRAND.name}: ${url}`
      : `Follow ${displayName}'s travel journey on ${BRAND.name}: ${url}`;
  }

  const parts: string[] = [];
  if (stats.countries > 0) {
    parts.push(
      `${stats.countries} ${stats.countries === 1 ? "country" : "countries"}`
    );
  }
  if (stats.cities > 0) {
    parts.push(`${stats.cities} ${stats.cities === 1 ? "city" : "cities"}`);
  }

  const statsPhrase = parts.join(" and ");
  return isOwnProfile
    ? `I've visited ${statsPhrase}! See my travel map on ${BRAND.name}: ${url}`
    : `${displayName} has visited ${statsPhrase}! See their travel map on ${BRAND.name}: ${url}`;
}
