"use client";

import Link from "next/link";

type HubSectionCtaProps = (
  | { label: string; onClick: () => void; href?: never; static?: never }
  | { label: string; href: string; onClick?: never; static?: never }
  | { label: string; static: true; onClick?: never; href?: never }
) & { className?: string };

export function HubSectionCta(props: HubSectionCtaProps) {
  const className = [
    props.static
      ? "city-page__pin-stat-cta city-page__pin-stat-cta--static"
      : "city-page__pin-stat-cta",
    props.className,
  ]
    .filter(Boolean)
    .join(" ");

  if ("onClick" in props && props.onClick) {
    return (
      <button type="button" className={className} onClick={props.onClick}>
        {props.label}
      </button>
    );
  }

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={className}>
        {props.label}
      </Link>
    );
  }

  return <span className={className}>{props.label}</span>;
}
