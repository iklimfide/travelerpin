import { locales } from "./config";

/**
 * First path segments that are never public profile usernames.
 * Keep in sync with top-level app routes under `app/[locale]`.
 */
const NON_PROFILE_FIRST_SEGMENTS = new Set([
  "api",
  "auth",
  "c",
  "city",
  "contact",
  "country",
  "imprint",
  "kamikaze",
  "login",
  "notifications",
  "og",
  "park",
  "parks",
  "policy",
  "register",
  "settings",
  "terms",
  "u",
  ...locales,
]);

/**
 * Remove leading locale segment(s) (`/tr`, `/en`, …) from a pathname.
 * next-intl's `usePathname` normally does this, but if the provider locale
 * and the URL prefix briefly disagree it can leave `/tr/...` intact — and
 * `router.replace(path, { locale: "tr" })` then produces `/tr/tr/...`.
 */
export function stripLocalePrefix(pathname: string): string {
  let result = pathname;
  let stripped = true;

  while (stripped) {
    stripped = false;
    for (const locale of locales) {
      if (result === `/${locale}`) {
        return "/";
      }
      if (result.startsWith(`/${locale}/`)) {
        result = result.slice(locale.length + 1);
        stripped = true;
        break;
      }
    }
  }

  return result || "/";
}

/**
 * Public profile routes stay locale-unprefixed in the browser URL:
 * `/arif`, `/arif/all`, `/arif/media`.
 */
export function isPublicProfilePath(pathname: string): boolean {
  const bare = stripLocalePrefix(pathname.split("?")[0] || pathname);
  const segments = bare.split("/").filter(Boolean);
  if (
    segments.length === 0 ||
    NON_PROFILE_FIRST_SEGMENTS.has(segments[0].toLowerCase())
  ) {
    return false;
  }
  return (
    segments.length === 1 ||
    (segments.length === 2 &&
      (segments[1] === "all" || segments[1] === "media"))
  );
}
