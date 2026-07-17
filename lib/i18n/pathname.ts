import { locales } from "./config";

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
