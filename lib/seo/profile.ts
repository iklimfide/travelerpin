import type { TravelStats } from "@/types/database";
import { profileShareUrl } from "@/lib/seo/site";

/** Profile share description used in page copy and share captions. */
export const PROFILE_SHARE_DESCRIPTION =
  "Create your own travel map on TravelerPin and share your journey with just one link.";

function profileShareHeadline(displayName: string, isOwnProfile: boolean): string {
  return isOwnProfile
    ? 'I can answer "How many countries have you visited?" with a single link.'
    : `${displayName} can answer "How many countries have you visited?" with a single link.`;
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

/** Full caption + URL. Prefer buildShareUrlOnly for apps that already show OG previews. */
export function buildShareText(
  displayName: string,
  _stats: TravelStats,
  username: string,
  options?: { url?: string; isOwnProfile?: boolean }
): string {
  const url = options?.url ?? profileShareUrl(username);
  const isOwnProfile = options?.isOwnProfile ?? false;
  return `${profileShareHeadline(displayName, isOwnProfile)}\n\n${PROFILE_SHARE_DESCRIPTION}\n\n${url}`;
}

/** URL only — WhatsApp/Telegram already render title + description from OG tags. */
export function buildShareUrlOnly(username: string, url?: string): string {
  return url ?? profileShareUrl(username);
}
