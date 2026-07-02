import type { ReactNode } from "react";

type HubSectionHeadingProps = {
  id: string;
  title: string;
  cta?: ReactNode;
};

export function HubSectionHeading({ id, title, cta }: HubSectionHeadingProps) {
  return (
    <h2 id={id} className="city-page__section-title city-page__section-title--with-cta">
      <span>{title}</span>
      {cta ? <span className="city-page__section-title-cta">{cta}</span> : null}
    </h2>
  );
}
