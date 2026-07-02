"use client";

import type { ReactNode } from "react";

export type HubPinStatCta = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type HubPinStatItem = {
  label: string;
  href?: string;
  cta?: HubPinStatCta;
};

type HubPagePinCountProps =
  | {
      items: HubPinStatItem[];
      renderCta?: (cta: HubPinStatCta) => ReactNode;
      label?: never;
      labelHref?: never;
      sublabels?: never;
    }
  | {
      items?: never;
      renderCta?: never;
      label: string;
      labelHref?: string;
      sublabels?: HubPinStatItem[];
    };

function PinStatLine({
  item,
  renderCta,
}: {
  item: HubPinStatItem;
  renderCta?: (cta: HubPinStatCta) => ReactNode;
}) {
  return (
    <p className="city-page__pin-stat">
      {item.href ? (
        <a href={item.href} className="city-page__pin-stat-link">
          {item.label}
        </a>
      ) : (
        <span>{item.label}</span>
      )}
      {item.cta ? (
        renderCta ? (
          renderCta(item.cta)
        ) : item.cta.href ? (
          <a href={item.cta.href} className="city-page__pin-stat-cta">
            {item.cta.label}
          </a>
        ) : item.cta.onClick ? (
          <button type="button" className="city-page__pin-stat-cta" onClick={item.cta.onClick}>
            {item.cta.label}
          </button>
        ) : (
          <span className="city-page__pin-stat-cta city-page__pin-stat-cta--static">
            {item.cta.label}
          </span>
        )
      ) : null}
    </p>
  );
}

export function HubPagePinCount(props: HubPagePinCountProps) {
  if ("items" in props && props.items) {
    return (
      <div className="city-page__pin-stats">
        {props.items.map((item) => (
          <PinStatLine
            key={`${item.href ?? ""}:${item.label}:${item.cta?.label ?? ""}`}
            item={item}
            renderCta={props.renderCta}
          />
        ))}
      </div>
    );
  }

  const { label, labelHref, sublabels = [] } = props;
  const lines: HubPinStatItem[] = [{ label, href: labelHref }, ...sublabels];

  if (sublabels.length === 0 && !labelHref) {
    return <p className="city-page__pin-stat">{label}</p>;
  }

  return (
    <div className="city-page__pin-stats">
      {lines.map((item) => (
        <PinStatLine key={`${item.href ?? ""}:${item.label}`} item={item} />
      ))}
    </div>
  );
}
