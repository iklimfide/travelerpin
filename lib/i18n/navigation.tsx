import NextLink from "next/link";
import { redirect as nextRedirect } from "next/navigation";
import { createNavigation } from "next-intl/navigation";
import { getLocale } from "next-intl/server";
import type { ComponentProps } from "react";
import { isPublicProfilePath, stripLocalePrefix } from "./pathname";
import { routing } from "./routing";

const {
  Link: IntlLink,
  redirect,
  usePathname,
  useRouter,
  getPathname,
} = createNavigation(routing);

export { redirect, usePathname, useRouter, getPathname };

type IntlLinkProps = ComponentProps<typeof IntlLink>;

function hrefPathname(href: IntlLinkProps["href"]): string | null {
  if (typeof href === "string") {
    return href.split("?")[0] || href;
  }
  if (
    href &&
    typeof href === "object" &&
    "pathname" in href &&
    typeof href.pathname === "string"
  ) {
    return href.pathname;
  }
  return null;
}

function toUnprefixedProfileHref(href: IntlLinkProps["href"]): IntlLinkProps["href"] {
  if (typeof href === "string") {
    const [path, query] = href.split("?");
    const bare = stripLocalePrefix(path || href);
    return query ? `${bare}?${query}` : bare;
  }
  if (
    href &&
    typeof href === "object" &&
    "pathname" in href &&
    typeof href.pathname === "string"
  ) {
    return {
      ...href,
      pathname: stripLocalePrefix(href.pathname),
    };
  }
  return href;
}

/**
 * Locale-aware Link that keeps public profile URLs unprefixed
 * (`/arif`, never `/tr/arif`).
 */
export function Link({ href, locale, ...rest }: IntlLinkProps) {
  const path = hrefPathname(href);
  if (path && isPublicProfilePath(path)) {
    return <NextLink href={toUnprefixedProfileHref(href)} {...rest} />;
  }
  return <IntlLink href={href} locale={locale} {...rest} />;
}

/**
 * Server-side redirect that keeps the current locale prefix (`/tr/...`),
 * except for public profiles which stay unprefixed.
 */
export async function redirectTo(href: string): Promise<never> {
  if (isPublicProfilePath(href)) {
    return nextRedirect(stripLocalePrefix(href));
  }
  const locale = await getLocale();
  return redirect({ href, locale });
}
