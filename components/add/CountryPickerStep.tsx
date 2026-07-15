"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
import { addDestinationMessages } from "@/lib/i18n/client-messages";
import { flagCountryCode, isUkNationCode, isUkNationVisited } from "@/lib/data/uk-nations";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { formatKnownPlaceName } from "@/lib/utils/city-name";
import type { CountryOption } from "@/lib/data/countries";

type CountryPickerStepProps = {
  visitedCodes: Set<string>;
  countedCodes?: Set<string>;
  activeCountryCodes?: Set<string>;
  pendingCountryCodes: Set<string>;
  pendingRemoveCountryCodes?: Set<string>;
  onToggleCountry: (country: CountryOption) => void;
  onOpenCountry: (country: CountryOption) => void;
  countriesOnly?: boolean;
  /** Hide checkboxes and open the country drill-down on tile click (e.g. parks flow). */
  hideCountryCheckbox?: boolean;
  searchPlaceholder?: string;
  regionProgressSuffix?: string;
  listHint?: string;
  /** Re-open this continent when returning from the city step. */
  initialExpandedRegion?: AddRegionId | null;
};

const MIN_SEARCH_LENGTH = 2;

function CountryTile({
  country,
  locked,
  checked,
  pending,
  onToggle,
  onOpen,
  countriesOnly = false,
  hideCountryCheckbox = false,
}: {
  country: CountryOption;
  locked: boolean;
  checked: boolean;
  pending: boolean;
  onToggle: () => void;
  onOpen: () => void;
  countriesOnly?: boolean;
  hideCountryCheckbox?: boolean;
}) {
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
        <span className="add-destination-country-tile__name">{displayName}</span>
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
  onToggleCountry,
  onOpenCountry,
  countriesOnly = false,
  hideCountryCheckbox = false,
  searchPlaceholder,
  regionProgressSuffix = "visited",
  listHint,
  initialExpandedRegion = null,
}: CountryPickerStepProps) {
  const progressCodes = countedCodes ?? visitedCodes;

  function isInCodeSet(code: string, codes: Set<string>): boolean {
    return isUkNationCode(code) ? isUkNationVisited(code, codes) : codes.has(code);
  }

  function countryTileState(code: string) {
    const locked = isInCodeSet(code, visitedCodes);
    const pendingAdd = pendingCountryCodes.has(code);
    const pendingRemove = pendingRemoveCountryCodes?.has(code) ?? false;

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
      checked: locked || pendingAdd,
      pending: pendingAdd && !locked,
    };
  }
  const [query, setQuery] = useState("");
  const [expandedRegion, setExpandedRegion] = useState<AddRegionId | null>(
    initialExpandedRegion
  );

  const groups = useMemo(() => groupCountriesByRegion(), []);

  const searchResults = useMemo(() => {
    const q = query.trim();
    if (q.length < MIN_SEARCH_LENGTH) return [];
    return searchCountriesForAdd(q);
  }, [query]);

  const isSearching = query.trim().length >= MIN_SEARCH_LENGTH;

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
        onToggle={() => onToggleCountry(country)}
        onOpen={() => onOpenCountry(country)}
        countriesOnly={countriesOnly}
        hideCountryCheckbox={hideCountryCheckbox}
      />
    );
  }

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
            placeholder={searchPlaceholder ?? addDestinationMessages.searchCountries}
            className="add-destination-search__input"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="add-destination-countries-scroll">
        <div className="add-destination-countries-scroll__inner">
          {isSearching ? (
            <div className="add-destination-country-grid-wrap">
              {searchResults.length === 0 ? (
                <p className="add-destination-empty">{addDestinationMessages.noCountryResults}</p>
              ) : (
                <div className="add-destination-country-grid">
                  {searchResults.map((country) => renderCountry(country))}
                </div>
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
