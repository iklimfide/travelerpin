import { redirect as nextRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/lib/i18n/navigation";
import { isPublicProfilePath, stripLocalePrefix } from "@/lib/i18n/pathname";

/**
 * Server-side redirect that keeps the current locale prefix (`/tr/...`),
 * except for public profiles which stay unprefixed.
 *
 * Kept separate from `navigation.tsx` so client imports of `Link` / hooks
 * never pull `next-intl/server` into the client bundle.
 */
export async function redirectTo(href: string): Promise<never> {
  if (isPublicProfilePath(href)) {
    return nextRedirect(stripLocalePrefix(href));
  }
  const locale = await getLocale();
  return redirect({ href, locale });
}
