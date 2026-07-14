"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddDestinationCheckbox } from "@/components/add/AddDestinationCheckbox";
import { addDestinationMessages, mapMessages } from "@/lib/i18n/client-messages";
import { catalogCountryCode, flagCountryCode } from "@/lib/data/uk-nations";
import { CONTACT_EMAIL } from "@/lib/legal/contact";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { canonicalCityKey, citiesAreSame } from "@/lib/utils/city-aliases";
import { formatKnownPlaceName } from "@/lib/utils/city-name";
import { AddDestinationCityListSkeleton } from "@/components/skeletons/AddDestinationModalSkeleton";

type CatalogCity = {
  countryCode: string;
  name: string;
  latitude: number;
  longitude: number;
  highlighted: boolean;
  isCapital: boolean;
};

type CityTier = {
  level: number;
  cities: CatalogCity[];
};

type CityPickerStepProps = {
  countryCode: string;
  countryName: string;
  existingCityNames: string[];
  pendingCityKeys: Set<string>;
  onToggleCity: (city: CatalogCity) => void;
  onBack: () => void;
  existingCityHint?: string;
};

const MIN_FILTER_LENGTH = 2;

export function citySelectionKey(countryCode: string, cityName: string): string {
  return canonicalCityKey(countryCode, cityName);
}

function tierLabel(): string {
  return addDestinationMessages.moreCities;
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

export function CityPickerStep({
  countryCode,
  countryName,
  existingCityNames,
  pendingCityKeys,
  onToggleCity,
  onBack,
  existingCityHint,
}: CityPickerStepProps) {
  const [tiers, setTiers] = useState<CityTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [openTierLevel, setOpenTierLevel] = useState<number | null>(null);
  const cityListRef = useRef<HTMLDivElement>(null);
  const tierSectionRefs = useRef<Map<number, HTMLElement>>(new Map());

  const existingNames = useMemo(
    () => existingCityNames,
    [existingCityNames]
  );

  const isFiltering = filter.trim().length >= MIN_FILTER_LENGTH;

  useEffect(() => {
    setFilter("");
  }, [countryCode]);

  useEffect(() => {
    setOpenTierLevel(null);
    setLoading(true);

    const params = new URLSearchParams({ country: catalogCountryCode(countryCode) });
    const q = filter.trim();
    if (q.length >= MIN_FILTER_LENGTH) {
      params.set("q", q);
    }

    const controller = new AbortController();

    fetch(`/api/cities/tourist?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          setTiers([]);
          return;
        }
        const data = await res.json();
        setTiers(data.tiers ?? []);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setTiers([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [countryCode, filter, isFiltering]);

  const displayTiers = useMemo(() => {
    if (!isFiltering) return tiers;
    return tiers;
  }, [isFiltering, tiers]);

  const totalCityCount = displayTiers.reduce((sum, tier) => sum + tier.cities.length, 0);
  const primaryTier = displayTiers[0];
  const moreTiers = displayTiers.slice(1);

  function toggleTier(level: number) {
    setOpenTierLevel((current) => (current === level ? null : level));
  }

  useEffect(() => {
    if (openTierLevel == null) return;

    const section = tierSectionRefs.current.get(openTierLevel);
    const list = cityListRef.current;
    if (!section || !list) return;

    // Keep the expanded header near the top of the list so the panel opens downward into view.
    const frame = window.requestAnimationFrame(() => {
      const listRect = list.getBoundingClientRect();
      const sectionRect = section.getBoundingClientRect();
      const nextTop = list.scrollTop + (sectionRect.top - listRect.top) - 8;
      list.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [openTierLevel]);

  function renderCityRow(city: CatalogCity) {
    const key = citySelectionKey(countryCode, city.name);
    const onMap = existingNames.some((name) => citiesAreSame(countryCode, name, city.name));
    const pending = pendingCityKeys.has(key);
    const checked = onMap || pending;
    const displayName = formatKnownPlaceName(city.name);

    return (
      <div
        key={key}
        className={`add-destination-city-row${onMap ? " is-disabled" : ""}`}
      >
        <AddDestinationCheckbox
          checked={checked}
          disabled={onMap}
          onChange={() =>
            onToggleCity({
              ...city,
              countryCode,
            })
          }
          label={displayName}
        />
        <div className="add-destination-city-row__body">
          <span className="add-destination-city-row__title-row">
            <span className="add-destination-city-row__name">{displayName}</span>
            {city.isCapital ? (
              <span className="add-destination-city-row__badge add-destination-city-row__badge--capital">
                {addDestinationMessages.capitalLabel}
              </span>
            ) : city.highlighted ? (
              <span className="add-destination-city-row__badge">{addDestinationMessages.popular}</span>
            ) : null}
          </span>
          {onMap ? (
            <span className="add-destination-city-row__meta">
              {existingCityHint ?? mapMessages.cityOnMap}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="add-destination-step add-destination-step--city">
      <div className="add-destination-city-toolbar">
        <div className="add-destination-city-header">
          <button type="button" className="add-destination-back" onClick={onBack}>
            {addDestinationMessages.back}
          </button>
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

        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={mapMessages.filterCities}
          className="add-destination-search__input add-destination-search__input--inline add-destination-search__input--city-toolbar"
          autoComplete="off"
        />
      </div>

      <div className="add-destination-city-list" ref={cityListRef}>
        {loading ? (
          <AddDestinationCityListSkeleton rows={8} />
        ) : totalCityCount === 0 && isFiltering ? (
          <MissingPlaceContactNotice />
        ) : totalCityCount === 0 ? (
          <p className="add-destination-empty">{mapMessages.citiesEmpty}</p>
        ) : (
          <>
            {primaryTier?.cities.map(renderCityRow)}
            {moreTiers.length > 0 ? (
              <div className="add-destination-city-tier-list">
                {moreTiers.map((tier) => {
                  const expanded = openTierLevel === tier.level;
                  return (
                    <section
                      key={tier.level}
                      className="add-destination-city-tier"
                      ref={(node) => {
                        if (node) tierSectionRefs.current.set(tier.level, node);
                        else tierSectionRefs.current.delete(tier.level);
                      }}
                    >
                      <button
                        type="button"
                        className={`add-destination-city-tier__header${expanded ? " is-expanded" : ""}`}
                        aria-expanded={expanded}
                        onClick={() => toggleTier(tier.level)}
                      >
                        <span className="add-destination-city-tier__chevron" aria-hidden>
                          {expanded ? "▴" : "▾"}
                        </span>
                        <span className="add-destination-city-tier__label">{tierLabel()}</span>
                        <span className="add-destination-city-tier__count">{tier.cities.length}</span>
                      </button>
                      {expanded ? (
                        <div className="add-destination-city-tier__panel">
                          {tier.cities.map(renderCityRow)}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            ) : null}
            {!isFiltering ? (
              <MissingPlaceContactNotice className="add-destination-empty--list-foot" />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
