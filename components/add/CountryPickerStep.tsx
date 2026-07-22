"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import {
  ADD_REGION_BROWN_EMOJI,
  ADD_REGION_EMOJI,
  ADD_REGION_ORDER,
  groupCountriesByRegion,
  regionCountryCounts,
  searchCountriesForAdd,
  type AddRegionId,
} from "@/lib/add/countries-by-region";
import { AddDestinationCheckbox } from "@/components/add/AddDestinationCheckbox";
import { citySelectionKey } from "@/components/add/CityPickerStep";
import { useAppMessages } from "@/lib/i18n/client-messages";
import { getLocalizedCityName } from "@/lib/i18n/place-names";
import { flagCountryCode, isUkNationCode, isUkNationVisited, matchesUkCityCountry } from "@/lib/data/uk-nations";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { citiesAreSame } from "@/lib/utils/city-aliases";
import { formatKnownPlaceName } from "@/lib/utils/city-name";
import { isCountryOnlyPinRemovable } from "@/lib/utils/country-remove";
import type { CountryOption } from "@/lib/data/countries";

type SearchCityResult = {
  cityName: string;
  displayName?: string;
  countryCode: string;
  countryName: string;
};

type CountryPickerStepProps = {
  visitedCodes: Set<string>;
  countedCodes?: Set<string>;
  activeCountryCodes?: Set<string>;
  pendingCountryCodes: Set<string>;
  pendingRemoveCountryCodes?: Set<string>;
  /** Allow unchecking country-only pins (no cities/parks) from the first step. */
  allowRemoveCountryOnly?: boolean;
  visitedCountries?: Array<{ country_code: string; id: string }>;
  visitedParks?: Array<{ country_code: string }>;
  onToggleCountry: (country: CountryOption) => void;
  onOpenCountry: (country: CountryOption) => void;
  countriesOnly?: boolean;
  /** Hide checkboxes and open the country drill-down on tile click (e.g. parks flow). */
  hideCountryCheckbox?: boolean;
  searchPlaceholder?: string;
  regionProgressSuffix?: string;
  listHint?: string;
  /** Small label under visited countries (e.g. wishlist picker). */
  visitedCountryHint?: string;
  /** Re-open this continent when returning from the city step. */
  initialExpandedRegion?: AddRegionId | null;
  /** Also search cities on the first screen (add places flow). */
  enableCitySearch?: boolean;
  visitedCities?: Array<{ country_code: string; city_name: string }>;
  pendingCityKeys?: Set<string>;
  pendingRemoveCityKeys?: Set<string>;
  allowToggleOnMap?: boolean;
  onToggleCity?: (city: { countryCode: string; name: string }) => void;
};

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 220;

function CountryTile({
  country,
  locked,
  checked,
  pending,
  visitedHint,
  onToggle,
  onOpen,
  countriesOnly = false,
  hideCountryCheckbox = false,
}: {
  country: CountryOption;
  locked: boolean;
  checked: boolean;
  pending: boolean;
  visitedHint?: string;
  onToggle: () => void;
  onOpen: () => void;
  countriesOnly?: boolean;
  hideCountryCheckbox?: boolean;
}) {
  const { common: commonMessages, map: mapMessages, addDestination: addDestinationMessages } = useAppMessages();
  const displayName = formatKnownPlaceName(country.name);
  const showVisited = locked && !hideCountryCheckbox;

  return (
    <div
      className={`add-destination-country-tile${showVisited ? " is-visited" : ""}${
        pending && !hideCountryCheckbox ? " is-pending" : ""
      }`}
    >
      {!hideCountryCheckbox ? (
        <AddDestinationCheckbox
          checked={checked}
          disabled={locked}
          onChange={onToggle}
          label={displayName}
        />
      ) : null}
      <button
        type="button"
        className="add-destination-country-tile__main"
        onClick={countriesOnly ? onToggle : onOpen}
      >
        <Image
          src={countryCodeToFlagUrl(flagCountryCode(country.code))}
          alt=""
          width={22}
          height={22}
          className="add-destination-country-tile__flag"
        />
        <span className="add-destination-country-tile__body">
          <span className="add-destination-country-tile__name">{displayName}</span>
          {locked && visitedHint ? (
            <span className="add-destination-country-tile__meta">{visitedHint}</span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

export function CountryPickerStep({
  visitedCodes,
  countedCodes,
  activeCountryCodes,
  pendingCountryCodes,
  pendingRemoveCountryCodes,
  allowRemoveCountryOnly = false,
  visitedCountries = [],
  visitedParks = [],
  onToggleCountry,
  onOpenCountry,
  countriesOnly = false,
  hideCountryCheckbox = false,
  searchPlaceholder,
  regionProgressSuffix = "visited",
  listHint,
  visitedCountryHint,
  initialExpandedRegion = null,
  enableCitySearch = false,
  visitedCities = [],
  pendingCityKeys,
  pendingRemoveCityKeys,
  allowToggleOnMap = false,
  onToggleCity,
}: CountryPickerStepProps) {
  const { common: commonMessages, map: mapMessages, addDestination: addDestinationMessages } = useAppMessages();
  const locale = useLocale() === "tr" ? "tr" : "en";
  const progressCodes = countedCodes ?? visitedCodes;

  function isInCodeSet(code: string, codes: Set<string>): boolean {
    return isUkNationCode(code) ? isUkNationVisited(code, codes) : codes.has(code);
  }

  function countryTileState(code: string) {
    const onMap = isInCodeSet(code, visitedCodes);
    const pendingAdd = pendingCountryCodes.has(code);
    const pendingRemove = pendingRemoveCountryCodes?.has(code) ?? false;
    const removable =
      allowRemoveCountryOnly &&
      isCountryOnlyPinRemovable(code, visitedCodes, visitedCountries, visitedCities, visitedParks);
    const locked = onMap && !removable;

    if (activeCountryCodes) {
      const saved = isInCodeSet(code, activeCountryCodes);
      return {
        locked,
        checked: locked || (saved && !pendingRemove) || pendingAdd,
        pending: (pendingAdd || pendingRemove) && !locked,
      };
    }

    return {
      locked,
      checked: (onMap && !pendingRemove) || pendingAdd,
      pending: pendingAdd || pendingRemove,
    };
  }
  const [query, setQuery] = useState("");
  const [expandedRegion, setExpandedRegion] = useState<AddRegionId | null>(
    initialExpandedRegion
  );
  const [searchCities, setSearchCities] = useState<SearchCityResult[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const groups = useMemo(() => groupCountriesByRegion(locale), [locale]);

  const countrySearchResults = useMemo(() => {
    const q = query.trim();
    if (q.length < MIN_SEARCH_LENGTH) return [];
    return searchCountriesForAdd(q, 60, locale);
  }, [query, locale]);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (!enableCitySearch || !isSearching) {
      setSearchCities([]);
      setLoadingCities(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingCities(true);
      try {
        const res = await fetch(
          `/api/destinations/search?q=${encodeURIComponent(trimmedQuery)}&locale=${locale}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setSearchCities([]);
          return;
        }
        const data = (await res.json()) as { cities?: SearchCityResult[] };
        setSearchCities(data.cities ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchCities([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCities(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [enableCitySearch, isSearching, trimmedQuery, locale]);

  function toggleRegion(region: AddRegionId) {
    setExpandedRegion((current) => (current === region ? null : region));
  }

  function renderCountry(country: CountryOption) {
    const code = country.code.toUpperCase();
    const { locked, checked, pending } = countryTileState(code);

    return (
      <CountryTile
        key={country.code}
        country={country}
        locked={locked}
        checked={checked}
        pending={pending}
        visitedHint={visitedCountryHint}
        onToggle={() => onToggleCountry(country)}
        onOpen={() => onOpenCountry(country)}
        countriesOnly={countriesOnly}
        hideCountryCheckbox={hideCountryCheckbox}
      />
    );
  }

  function isCityOnMap(countryCode: string, cityName: string): boolean {
    return visitedCities.some(
      (visited) =>
        matchesUkCityCountry(visited.country_code, countryCode) &&
        citiesAreSame(countryCode, visited.city_name, cityName)
    );
  }

  function renderSearchCity(city: SearchCityResult) {
    const key = citySelectionKey(city.countryCode, city.cityName);
    const onMap = isCityOnMap(city.countryCode, city.cityName);
    const pendingRemove = pendingRemoveCityKeys?.has(key) ?? false;
    const pendingAdd = pendingCityKeys?.has(key) ?? false;
    const locked = onMap && !allowToggleOnMap;
    const checked = (onMap && !pendingRemove) || pendingAdd;
    const pending = pendingAdd || pendingRemove;
    const displayName =
      locale === "tr" && city.displayName
        ? city.displayName
        : getLocalizedCityName(city.countryCode, city.cityName, locale);
    const countryLabel = formatKnownPlaceName(city.countryName);

    function toggle() {
      if (locked || !onToggleCity) return;
      onToggleCity({
        countryCode: city.countryCode,
        name: city.cityName,
      });
    }

    return (
      <div
        key={key}
        className={`add-destination-city-row${locked ? " is-disabled" : ""}${
          pending ? " is-pending" : ""
        }`}
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
          label={`${displayName}, ${countryLabel}`}
        />
        <Image
          src={countryCodeToFlagUrl(flagCountryCode(city.countryCode))}
          alt=""
          width={22}
          height={22}
          className="add-destination-search-city__flag"
        />
        <div className="add-destination-city-row__body">
          <span className="add-destination-city-row__title-row">
            <span className="add-destination-city-row__name">{displayName}</span>
          </span>
          <span className="add-destination-search-city__country">{countryLabel}</span>
          {onMap && !pendingRemove ? (
            <span className="add-destination-city-row__meta">{mapMessages.cityOnMap}</span>
          ) : null}
        </div>
      </div>
    );
  }

  const defaultPlaceholder = enableCitySearch
    ? addDestinationMessages.searchPlaces
    : addDestinationMessages.searchCountries;
  const emptyMessage = enableCitySearch
    ? addDestinationMessages.noPlaceResults
    : addDestinationMessages.noCountryResults;
  const hasCountryResults = countrySearchResults.length > 0;
  const hasCityResults = searchCities.length > 0;
  const searchEmpty =
    !hasCountryResults && !hasCityResults && !loadingCities;

  return (
    <div className="add-destination-step add-destination-step--countries">
      <div className="add-destination-countries-toolbar">
        <div className="add-destination-search">
          <span className="add-destination-search__icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder ?? defaultPlaceholder}
            className="add-destination-search__input"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="add-destination-countries-scroll">
        <div className="add-destination-countries-scroll__inner">
          {isSearching ? (
            <div className="add-destination-search-results">
              {searchEmpty ? (
                <p className="add-destination-empty">{emptyMessage}</p>
              ) : (
                <>
                  {hasCountryResults ? (
                    <section className="add-destination-search-section">
                      {enableCitySearch ? (
                        <h3 className="add-destination-search-section__title">
                          {commonMessages.countries}
                        </h3>
                      ) : null}
                      <div className="add-destination-country-grid-wrap">
                        <div className="add-destination-country-grid">
                          {countrySearchResults.map((country) => renderCountry(country))}
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {enableCitySearch ? (
                    <section className="add-destination-search-section">
                      {(hasCityResults || loadingCities) && hasCountryResults ? (
                        <h3 className="add-destination-search-section__title">
                          {commonMessages.cities}
                        </h3>
                      ) : null}
                      {loadingCities && !hasCityResults ? (
                        <p className="add-destination-empty">{commonMessages.loading}</p>
                      ) : hasCityResults ? (
                        <div className="add-destination-search-city-list">
                          {searchCities.map((city) => renderSearchCity(city))}
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <>
              <div className="add-destination-region-list">
                {ADD_REGION_ORDER.map((region) => {
                  if (region === "special" && groups.special.length === 0) {
                    return null;
                  }

                  const expanded = expandedRegion === region;
                  const { visited, total } = regionCountryCounts(region, progressCodes, groups);

                  return (
                    <section key={region} className="add-destination-region">
                      <button
                        type="button"
                        className={`add-destination-region__header${expanded ? " is-expanded" : ""}`}
                        aria-expanded={expanded}
                        onClick={() => toggleRegion(region)}
                      >
                        <span className="add-destination-region__chevron" aria-hidden>
                          {expanded ? "▴" : "▾"}
                        </span>
                        <span className="add-destination-region__label">
                          <span
                            className={`add-destination-region__emoji${
                              ADD_REGION_BROWN_EMOJI.has(region)
                                ? " add-destination-region__emoji--brown"
                                : ""
                            }`}
                            aria-hidden
                          >
                            {ADD_REGION_EMOJI[region]}
                          </span>
                          <span>{addDestinationMessages.regions[region]}</span>
                        </span>
                        <span
                          className="add-destination-region__count"
                          aria-label={`${visited} of ${total} countries ${regionProgressSuffix}`}
                        >
                          {visited} / {total}
                        </span>
                      </button>

                      {expanded ? (
                        <div className="add-destination-region__panel">
                          <div className="add-destination-country-grid">
                            {groups[region].map((country) => renderCountry(country))}
                          </div>
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
              {listHint ? (
                <p className="add-destination-list-hint">{listHint}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
