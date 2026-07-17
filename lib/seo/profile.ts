import type { TravelStats } from "@/types/database";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import { profileShareUrl } from "@/lib/seo/site";

/** English fallbacks — prefer message catalog / getTranslations when locale is known. */
export const PROFILE_SHARE_DESCRIPTION =
  "Create your own travel map on TravelerPin and share your journey with just one link.";

export type ProfileShareCopy = {
  captionOwn: string;
  captionGuest: string;
  captionDescription: string;
};

const EN_SHARE_COPY: ProfileShareCopy = {
  captionOwn:
    'I can answer "How many countries have you visited?" with a single link. Create your map too — answer with a single link.',
  captionGuest:
    '{name} can answer "How many countries have you visited?" with a single link. Create your map too — answer with a single link.',
  captionDescription: PROFILE_SHARE_DESCRIPTION,
};

function fillName(template: string, displayName: string): string {
  return template.includes("{name}")
    ? template.replaceAll("{name}", displayName)
    : template;
}

function profileShareHeadline(
  displayName: string,
  isOwnProfile: boolean,
  copy: ProfileShareCopy
): string {
  return isOwnProfile
    ? copy.captionOwn
    : fillName(copy.captionGuest, displayName);
}

export function buildProfileTitle(
  displayName: string,
  username: string
): string {
  return displayName === username ? `@${username}` : `${displayName} (@${username})`;
}

export function buildProfileDescription(
  displayName: string,
  _stats: TravelStats,
  copy: ProfileShareCopy = EN_SHARE_COPY
): string {
  return `${profileShareHeadline(displayName, false, copy)} ${copy.captionDescription}`;
}

/** Full caption + URL. Prefer buildShareUrlOnly for apps that already show OG previews. */
export function buildShareText(
  displayName: string,
  _stats: TravelStats,
  username: string,
  options?: {
    url?: string;
    isOwnProfile?: boolean;
    copy?: ProfileShareCopy;
    locale?: Locale;
  }
): string {
  const locale = options?.locale ?? defaultLocale;
  const url = options?.url ?? profileShareUrl(username, locale);
  const isOwnProfile = options?.isOwnProfile ?? false;
  const copy = options?.copy ?? EN_SHARE_COPY;
  return `${profileShareHeadline(displayName, isOwnProfile, copy)}\n\n${copy.captionDescription}\n\n${url}`;
}

/** URL only — WhatsApp/Telegram already render title + description from OG tags. */
export function buildShareUrlOnly(
  username: string,
  url?: string,
  locale: Locale = defaultLocale
): string {
  return url ?? profileShareUrl(username, locale);
}
