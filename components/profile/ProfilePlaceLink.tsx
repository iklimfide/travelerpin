import Link from "next/link";
import { cityPath, countryPath, parkPath } from "@/lib/seo/site";

type ProfilePlaceLinkProps = {
  href: string | null;
  children: string;
  className?: string;
  title?: string;
};

function ProfilePlaceLink({ href, children, className = "", title }: ProfilePlaceLinkProps) {
  if (!href) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={`profile-place-link ${className}`.trim()} title={title}>
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
}: {
  slug: string | null;
  name: string;
  className?: string;
}) {
  return (
    <ProfilePlaceLink href={slug ? countryPath(slug) : null} className={className}>
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
