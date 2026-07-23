import NextLink from "next/link";
import { createNavigation } from "next-intl/navigation";
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

function toBareHref(href: IntlLinkProps["href"]): IntlLinkProps["href"] {
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
 *
 * Non-profile hrefs must be locale-unprefixed (`/park/foo`). If a caller
 * already ran `getPathname`, strip the prefix so IntlLink does not emit
 * `/tr/tr/...`.
 */
export function Link({ href, locale, ...rest }: IntlLinkProps) {
  const bareHref = toBareHref(href);
  const path = hrefPathname(bareHref);
  if (path && isPublicProfilePath(path)) {
    return <NextLink href={bareHref} {...rest} />;
  }
  return <IntlLink href={bareHref} locale={locale} {...rest} />;
}
