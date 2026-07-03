import type { TravelStats } from "@/types/database";
import { profileShareUrl } from "@/lib/seo/site";

/** Profile share / OG description. */
export const PROFILE_SHARE_DESCRIPTION =
  "Create your own travel map on TravelerPin and share your journey with just one link.";

function profileShareHeadline(displayName: string, isOwnProfile: boolean): string {
  return isOwnProfile
    ? 'I can answer "How many countries have you visited?" with a single link.'
    : `${displayName} can answer "How many countries have you visited?" with a single link.`;
}

/** Open Graph / Twitter card title for public profile links. */
export function buildProfileOgTitle(displayName: string): string {
  // Link previews always describe the profile owner in third person.
  return profileShareHeadline(displayName, false);
}

/** Open Graph / Twitter card description for public profile links. */
export function buildProfileOgDescription(): string {
  return PROFILE_SHARE_DESCRIPTION;
}

export function buildProfileTitle(
  displayName: string,
  username: string
): string {
  return displayName === username ? `@${username}` : `${displayName} (@${username})`;
}

export function buildProfileDescription(
  displayName: string,
  _stats: TravelStats
): string {
  return `${profileShareHeadline(displayName, false)} ${PROFILE_SHARE_DESCRIPTION}`;
}

export function buildShareText(
  displayName: string,
  _stats: TravelStats,
  username: string,
  options?: { url?: string; isOwnProfile?: boolean }
): string {
  const url = options?.url ?? profileShareUrl(username);
  const isOwnProfile = options?.isOwnProfile ?? true;
  return `${profileShareHeadline(displayName, isOwnProfile)}\n\n${PROFILE_SHARE_DESCRIPTION}\n\n${url}`;
}
