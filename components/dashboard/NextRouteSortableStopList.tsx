"use client";

import Image from "next/image";
import { formatMessage, useAppMessages } from "@/lib/i18n/client-messages";
import type { Locale } from "@/lib/i18n/config";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { stopDedupeKey } from "@/lib/utils/next-route";
import type { NextRouteStop } from "@/types/database";
import { getCountryName } from "@/lib/data/countries";
import { getLocalizedCityName } from "@/lib/i18n/place-names";

type Row = {
  id: string;
  kind: "country" | "city";
  title: string;
  subtitle: string;
  countryCode: string;
  stopKey: string;
};

function stopToRow(stop: NextRouteStop, locale: Locale): Row {
  if (stop.kind === "country") {
    const code = stop.countryCode ?? "";
    const name = getCountryName(code || stop.name, locale) || stop.name;
    return {
      id: stop.id,
      kind: "country",
      title: name,
      subtitle: code,
      countryCode: code,
      stopKey: stopDedupeKey(stop),
    };
  }
  const code = stop.countryCode ?? "";
  const cityName = stop.name;
  return {
    id: stop.id,
    kind: "city",
    title: getLocalizedCityName(code, cityName, locale),
    subtitle: getCountryName(code, locale),
    countryCode: code,
    stopKey: stopDedupeKey(stop),
  };
}

function reorderStops(stops: NextRouteStop[], fromIndex: number, toIndex: number): NextRouteStop[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= stops.length) {
    return stops;
  }
  const next = [...stops];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return stops;
  next.splice(toIndex, 0, item);
  return next;
}

type NextRouteSortableStopListProps = {
  stops: NextRouteStop[];
  locale: Locale;
  busyId: string | null;
  removeStopLabel: string;
  onReorder: (stops: NextRouteStop[]) => void;
  onRemove: (key: string) => void;
};

export function NextRouteSortableStopList({
  stops,
  locale,
  busyId,
  removeStopLabel,
  onReorder,
  onRemove,
}: NextRouteSortableStopListProps) {
  const { nextRoute: nextRouteMessages } = useAppMessages();

  function handlePositionChange(fromIndex: number, nextPosition: number) {
    const toIndex = nextPosition - 1;
    if (toIndex < 0 || toIndex >= stops.length || toIndex === fromIndex) return;
    onReorder(reorderStops(stops, fromIndex, toIndex));
  }

  return (
    <>
      {stops.map((stop, index) => {
        const row = stopToRow(stop, locale);
        const isBusy = busyId === row.stopKey;
        const position = index + 1;
        return (
          <li key={stop.id} data-stop-index={index} className="save-destination-modal__item">
            <div className="save-destination-modal__row">
              <select
                className="save-destination-modal__route-node save-destination-modal__route-node--select"
                value={position}
                disabled={isBusy || stops.length < 2}
                aria-label={formatMessage(nextRouteMessages.reorderStopPosition, {
                  position: String(position),
                })}
                onChange={(event) => {
                  handlePositionChange(index, Number(event.target.value));
                }}
              >
                {stops.map((_, optionIndex) => (
                  <option key={optionIndex + 1} value={optionIndex + 1}>
                    {optionIndex + 1}
                  </option>
                ))}
              </select>
              <span className="save-destination-modal__flag">
                <Image
                  src={countryCodeToFlagUrl(row.countryCode)}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              </span>
              <span className="save-destination-modal__text">
                <span className="save-destination-modal__name" title={row.title}>
                  {row.title}
                </span>
                <span className="save-destination-modal__meta" title={row.subtitle}>
                  {row.subtitle}
                </span>
              </span>
              <button
                type="button"
                className="save-destination-modal__check save-destination-modal__check--on"
                onClick={() => onRemove(row.stopKey)}
                disabled={isBusy}
                aria-label={removeStopLabel}
              >
                ✓
              </button>
            </div>
          </li>
        );
      })}
    </>
  );
}
