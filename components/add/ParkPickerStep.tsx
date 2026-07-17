"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddDestinationCheckbox } from "@/components/add/AddDestinationCheckbox";
import { addDestinationMessages, mapMessages, parkMessages, useAppMessages } from "@/lib/i18n/client-messages";
import { flagCountryCode } from "@/lib/data/uk-nations";
import { CONTACT_EMAIL } from "@/lib/legal/contact";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { formatKnownPlaceName } from "@/lib/utils/city-name";
import { shortParkLabel } from "@/lib/utils/park-name";
import { matchesParkTypeFilter, parkTypeLabel } from "@/lib/utils/park-type";
import type { ParkType } from "@/types/database";
import { AddDestinationCityListSkeleton } from "@/components/skeletons/AddDestinationModalSkeleton";

export type CatalogPark = {
  parkType: ParkType;
  countryCode: string;
  name: string;
  latitude: number;
  longitude: number;
};

type ParkPickerStepProps = {
  countryCode: string;
  countryName: string;
  existingParkKeys: string[];
  pendingParkKeys: Set<string>;
  pendingRemoveParkKeys?: Set<string>;
  allowToggleOnMap?: boolean;
  onTogglePark: (park: CatalogPark) => void;
};

const MIN_FILTER_LENGTH = 2;
const ALL_TYPES = "ALL";

export function parkSelectionKey(parkType: ParkType, parkName: string): string {
  return `${parkType}:${parkName}`.toLowerCase();
}

function MissingPlaceContactNotice({ className }: { className?: string }) {
  return (
    <p className={`add-destination-empty add-destination-empty--contact${className ? ` ${className}` : ""}`}>
      {addDestinationMessages.missingPlacePrompt}{" "}
      <a href={`mailto:${CONTACT_EMAIL}`} className="add-destination-empty__email">
        {CONTACT_EMAIL}
      </a>{" "}
      {addDestinationMessages.missingPlacePromptSuffix}
    </p>
  );
}

export function ParkPickerStep({
  countryCode,
  countryName,
  existingParkKeys,
  pendingParkKeys,
  pendingRemoveParkKeys,
  allowToggleOnMap = false,
  onTogglePark,
}: ParkPickerStepProps) {
  const { map: mapMessages, park: parkMessages, addDestination: addDestinationMessages } = useAppMessages();
  const [parks, setParks] = useState<CatalogPark[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES);
  const hasLoadedRef = useRef(false);

  const existingKeys = useMemo(
    () => new Set(existingParkKeys.map((key) => key.toLowerCase())),
    [existingParkKeys]
  );

  const isFiltering = filter.trim().length >= MIN_FILTER_LENGTH;

  useEffect(() => {
    setFilter("");
    setTypeFilter(ALL_TYPES);
    hasLoadedRef.current = false;
  }, [countryCode]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      setLoading(true);
    }

    const params = new URLSearchParams({ country: countryCode.toUpperCase() });
    const q = filter.trim();
    if (q.length >= MIN_FILTER_LENGTH) {
      params.set("q", q);
    }

    const controller = new AbortController();

    fetch(`/api/parks/tourist?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          setParks([]);
          return;
        }
        const data = await res.json();
        setParks((data.parks ?? []) as CatalogPark[]);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setParks([]);
      })
      .finally(() => {
        hasLoadedRef.current = true;
        setLoading(false);
      });

    return () => controller.abort();
  }, [countryCode, filter, isFiltering]);

  const displayParks = useMemo(() => {
    let next = parks;
    if (typeFilter !== ALL_TYPES) {
      next = next.filter((park) =>
        matchesParkTypeFilter(park.parkType, typeFilter as ParkType)
      );
    }
    return [...next].sort((a, b) =>
      a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
    );
  }, [parks, typeFilter]);

  function renderParkRow(park: CatalogPark) {
    const key = parkSelectionKey(park.parkType, park.name);
    const onMap = existingKeys.has(key);
    const pendingRemove = pendingRemoveParkKeys?.has(key) ?? false;
    const pendingAdd = pendingParkKeys.has(key);
    const locked = onMap && !allowToggleOnMap;
    const checked = (onMap && !pendingRemove) || pendingAdd;
    const pending = pendingAdd || pendingRemove;
    const fullName = formatKnownPlaceName(park.name);
    const displayName = shortParkLabel(park.name);
    const typeLabel = parkTypeLabel(park.parkType);

    function toggle() {
      if (locked) return;
      onTogglePark({
        ...park,
        countryCode,
      });
    }

    return (
      <div
        key={key}
        className={`add-destination-city-row${locked ? " is-disabled" : ""}${pending ? " is-pending" : ""}`}
        onClick={locked ? undefined : toggle}
        onKeyDown={
          locked
            ? undefined
            : (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggle();
                }
              }
        }
        role={locked ? undefined : "button"}
        tabIndex={locked ? undefined : 0}
      >
        <AddDestinationCheckbox
          checked={checked}
          disabled={locked}
          onChange={toggle}
          label={displayName}
        />
        <div className="add-destination-city-row__body">
          <span className="add-destination-city-row__title-row">
            <span className="add-destination-city-row__name" title={fullName}>
              {displayName}
            </span>
            <span className="add-destination-city-row__badge">{typeLabel}</span>
          </span>
          {onMap && !pendingRemove ? (
            <span className="add-destination-city-row__meta">{mapMessages.parkOnMap}</span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="add-destination-step add-destination-step--city">
      <div className="add-destination-city-toolbar">
        <div className="add-destination-city-header">
          <div className="add-destination-city-header__title-row">
            <Image
              src={countryCodeToFlagUrl(flagCountryCode(countryCode))}
              alt=""
              width={28}
              height={28}
              className="add-destination-city-header__flag"
            />
            <h2 className="add-destination-city-header__title">{countryName}</h2>
          </div>
        </div>

        <div className="add-destination-type-filters" role="group" aria-label={parkMessages.allTypes}>
          {[
            { value: ALL_TYPES, label: parkMessages.allTypes },
            { value: "national_park", label: parkMessages.nationalPark },
            { value: "theme_park", label: parkMessages.themePark },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`add-destination-type-filter${
                typeFilter === option.value ? " is-active" : ""
              }`}
              onClick={() => setTypeFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={mapMessages.filterParks}
          className="add-destination-search__input add-destination-search__input--inline add-destination-search__input--city-toolbar"
          autoComplete="off"
        />
      </div>

      <div className="add-destination-city-list">
        {loading ? (
          <AddDestinationCityListSkeleton rows={8} />
        ) : displayParks.length === 0 && isFiltering ? (
          <MissingPlaceContactNotice />
        ) : displayParks.length === 0 ? (
          <p className="add-destination-empty">{mapMessages.parksEmpty}</p>
        ) : (
          <>
            {displayParks.map(renderParkRow)}
            {!isFiltering ? (
              <MissingPlaceContactNotice className="add-destination-empty--list-foot" />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
