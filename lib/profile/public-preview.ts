import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";
import { profilePath } from "@/lib/seo/site";
import { getWishlistCountryCodes } from "@/lib/utils/stats";

export const PROFILE_PUBLIC_PREVIEW_PARAM = "view";
export const PROFILE_PUBLIC_PREVIEW_VALUE = "public";

type SearchParamsLike =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | null
  | undefined;

export function isProfilePublicPreview(searchParams: SearchParamsLike): boolean {
  if (!searchParams) return false;

  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(PROFILE_PUBLIC_PREVIEW_PARAM) === PROFILE_PUBLIC_PREVIEW_VALUE;
  }

  const value = searchParams[PROFILE_PUBLIC_PREVIEW_PARAM];
  if (Array.isArray(value)) {
    return value[0] === PROFILE_PUBLIC_PREVIEW_VALUE;
  }

  return value === PROFILE_PUBLIC_PREVIEW_VALUE;
}

export function profilePublicPreviewHref(username: string): string {
  return `${profilePath(username)}?${PROFILE_PUBLIC_PREVIEW_PARAM}=${PROFILE_PUBLIC_PREVIEW_VALUE}`;
}

export function withProfilePublicPreview(href: string, previewAsPublic: boolean): string {
  if (!previewAsPublic) return href;
  if (href.includes(`${PROFILE_PUBLIC_PREVIEW_PARAM}=${PROFILE_PUBLIC_PREVIEW_VALUE}`)) {
    return href;
  }
  return href.includes("?")
    ? `${href}&${PROFILE_PUBLIC_PREVIEW_PARAM}=${PROFILE_PUBLIC_PREVIEW_VALUE}`
    : `${href}?${PROFILE_PUBLIC_PREVIEW_PARAM}=${PROFILE_PUBLIC_PREVIEW_VALUE}`;
}

/** Hide owner-only wishlist while keeping auth session for the preview banner / menu. */
export function applyPublicPreviewToProfileData(
  data: PublicProfilePageData
): PublicProfilePageData {
  if (data.profile.wishlist_public) return data;

  return {
    ...data,
    wishlistCountries: [],
    wishlistCodes: [],
  };
}

export function filterWishlistForProfileView(
  data: PublicProfilePageData,
  isOwnProfile: boolean
): Pick<PublicProfilePageData, "wishlistCountries" | "wishlistCodes"> {
  if (isOwnProfile || data.profile.wishlist_public) {
    return {
      wishlistCountries: data.wishlistCountries,
      wishlistCodes: data.wishlistCodes,
    };
  }

  return {
    wishlistCountries: [],
    wishlistCodes: getWishlistCountryCodes([]),
  };
}
