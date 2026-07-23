"use client";

import { useLocale } from "next-intl";
import { Link, getPathname } from "@/lib/i18n/navigation";
import { isPublicProfilePath } from "@/lib/i18n/pathname";
import type { Locale } from "@/lib/i18n/config";
import { cityPath, countryPath, parkPath } from "@/lib/seo/site";

type ProfilePlaceLinkProps = {
  href: string | null;
  children: string;
  className?: string;
  title?: string;
};

function resolvePlaceHref(href: string, locale: Locale): string {
  if (isPublicProfilePath(href)) return href;
  return getPathname({ href, locale });
}

function ProfilePlaceLink({ href, children, className = "", title }: ProfilePlaceLinkProps) {
  const locale: Locale = useLocale() === "tr" ? "tr" : "en";

  if (!href) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={resolvePlaceHref(href, locale)}
      className={`profile-place-link ${className}`.trim()}
      title={title}
      prefetch={false}
    >
      {children}
    </Link>
  );
}

export function ProfileCityLink({
  slug,
  name,
  className,
  title,
}: {
  slug: string | null;
  name: string;
  className?: string;
  title?: string;
}) {
  return (
    <ProfilePlaceLink href={slug ? cityPath(slug) : null} className={className} title={title ?? name}>
      {name}
    </ProfilePlaceLink>
  );
}

export function ProfileCountryLink({
  slug,
  name,
  className,
  title,
}: {
  slug: string | null;
  name: string;
  className?: string;
  title?: string;
}) {
  return (
    <ProfilePlaceLink href={slug ? countryPath(slug) : null} className={className} title={title ?? name}>
      {name}
    </ProfilePlaceLink>
  );
}

export function ProfileParkLink({
  slug,
  name,
  className,
  title,
}: {
  slug: string | null;
  name: string;
  className?: string;
  title?: string;
}) {
  return (
    <ProfilePlaceLink href={slug ? parkPath(slug) : null} className={className} title={title ?? name}>
      {name}
    </ProfilePlaceLink>
  );
}
