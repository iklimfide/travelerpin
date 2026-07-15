"use client";

import { useEffect, useMemo, useState } from "react";
import { CityForm } from "@/components/dashboard/CityForm";
import { ProfileDestinationEditModal } from "@/components/profile/ProfileDestinationEditModal";
import { ProfileCityLink, ProfileCountryLink } from "@/components/profile/ProfilePlaceLink";
import { useModal } from "@/components/ui/ModalProvider";
import { deleteCitiesBatch } from "@/lib/client/city-actions";
import { getCountryName } from "@/lib/data/countries";
import { resolveCountryHubSlug } from "@/lib/data/country-hubs";
import { findCityHubSlug } from "@/lib/data/city-hubs";
import { canonicalCityName } from "@/lib/utils/city-aliases";
import { buildCitySlug } from "@/lib/utils/city-slug";
import {
  cityMessages,
  commonMessages,
  formatMessage,
  modalMessages,
  translateCity,
} from "@/lib/i18n/client-messages";
import { formatVisitDatesSummary } from "@/lib/utils/visit-date";
import { getIntlLocale } from "@/lib/i18n/config";
import type { VisitedCity, VisitedCountry } from "@/types/database";

const ALL_COUNTRIES = "ALL";

const ownerHubLinkClass = (embedded: boolean, muted = false) =>
  [
    "profile-owner-hub-link",
    embedded && muted ? "profile-owner-hub-link--muted" : "",
    !embedded && muted ? "font-normal text-slate-400" : "",
  ]
    .filter(Boolean)
    .join(" ");

type CityListProps = {
  cities: VisitedCity[];
  countries: VisitedCountry[];
  embedded?: boolean;
  /** When set, filter the list to this country code (e.g. from My Countries remove flow). */
  initialCountryFilter?: string | null;
};

function sortCities(cities: VisitedCity[], countryFilter: string): VisitedCity[] {
  return [...cities].sort((a, b) => {
    if (countryFilter === ALL_COUNTRIES) {
      const byCountry = getCountryName(a.country_code).localeCompare(
        getCountryName(b.country_code),
        undefined,
        { sensitivity: "base" }
      );
      if (byCountry !== 0) return byCountry;
    }
    return a.city_name.localeCompare(b.city_name, undefined, { sensitivity: "base" });
  });
}

export function CityList({
  cities,
  countries,
  embedded = false,
  initialCountryFilter = null,
}: CityListProps) {
  const modal = useModal();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [countryFilter, setCountryFilter] = useState(() =>
    initialCountryFilter?.trim()
      ? initialCountryFilter.trim().toUpperCase()
      : ALL_COUNTRIES
  );

  useEffect(() => {
    if (!initialCountryFilter?.trim()) return;
    setCountryFilter(initialCountryFilter.trim().toUpperCase());
  }, [initialCountryFilter]);

  const canAddCity = countries.length > 0;

  const countryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const city of cities) {
      const code = city.country_code.toUpperCase();
      if (!map.has(code)) {
        map.set(code, getCountryName(code));
      }
    }
    if (initialCountryFilter?.trim()) {
      const code = initialCountryFilter.trim().toUpperCase();
      if (!map.has(code)) {
        map.set(code, getCountryName(code));
      }
    }
    return [...map.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [cities, initialCountryFilter]);

  const filteredCities = useMemo(() => {
    const list =
      countryFilter === ALL_COUNTRIES
        ? cities
        : cities.filter((city) => city.country_code.toUpperCase() === countryFilter);

    return sortCities(list, countryFilter);
  }, [cities, countryFilter]);

  const showCountryFilter = countryOptions.length > 1 || countryFilter !== ALL_COUNTRIES;
  const selectedCount = useMemo(
    () => filteredCities.filter((city) => selectedIds.has(city.id)).length,
    [filteredCities, selectedIds]
  );
  const allFilteredSelected =
    filteredCities.length > 0 && selectedCount === filteredCities.length;

  useEffect(() => {
    const visible = new Set(filteredCities.map((city) => city.id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (visible.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [filteredCities]);

  function toggleCity(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const city of filteredCities) next.delete(city.id);
        return next;
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const city of filteredCities) next.add(city.id);
      return next;
    });
  }

  async function handleDeleteSelected() {
    const ids = filteredCities
      .filter((city) => selectedIds.has(city.id))
      .map((city) => city.id);
    if (ids.length === 0 || deleting) return;

    const confirmed = await modal.confirm(
      ids.length === 1
        ? modalMessages.deleteCityMessage
        : cityMessages.deleteSelectedMessage,
      {
        title:
          ids.length === 1
            ? modalMessages.deleteCityTitle
            : cityMessages.deleteSelectedTitle,
        destructive: true,
      }
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const result = await deleteCitiesBatch({ ids });
      if (!result.ok) {
        await modal.alert(result.error, { variant: "error" });
        return;
      }
      setSelectedIds(new Set());
    } finally {
      setDeleting(false);
    }
  }

  if (adding) {
    return (
      <CityForm
        visitedCountries={countries}
        existingCities={cities}
        onSuccess={() => setAdding(false)}
        onCancel={() => setAdding(false)}
        onEditExisting={(id) => {
          setAdding(false);
          setEditingId(id);
        }}
      />
    );
  }

  const editingCity = cities.find((c) => c.id === editingId);

  return (
    <section className={`flex min-w-0 max-w-full flex-col gap-4${embedded ? " profile-owner-edit-surface" : ""}`}>
      {!embedded ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <h2 className="min-w-0 dashboard-section-title-city">
            {cityMessages.title}
            <span className="ml-2 text-sm font-normal text-slate-500">
              · {cityMessages.visitedOnly}
            </span>
          </h2>
          {canAddCity ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="dashboard-btn-add-city"
            >
              + {cityMessages.add}
            </button>
          ) : null}
        </div>
      ) : null}

      {!canAddCity ? (
        <p className={embedded ? "profile-owner-empty" : "text-sm text-slate-500"}>
          {cityMessages.addCountryFirst}
        </p>
      ) : cities.length === 0 ? (
        <p className={embedded ? "profile-owner-empty" : "text-sm text-slate-500"}>{cityMessages.empty}</p>
      ) : (
        <>
          {showCountryFilter ? (
            <div className="max-w-xs">
              <label
                htmlFor="city-list-country-filter"
                className={embedded ? "profile-owner-label" : "mb-1.5 block text-sm text-slate-400"}
              >
                {cityMessages.filterByCountry}
              </label>
              <select
                id="city-list-country-filter"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className={embedded ? "profile-owner-input w-full" : "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"}
              >
                <option value={ALL_COUNTRIES}>{cityMessages.allCountries}</option>
                {countryOptions.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {filteredCities.length === 0 ? (
            <p className={embedded ? "profile-owner-empty" : "text-sm text-slate-500"}>
              {cityMessages.noCitiesInCountry}
            </p>
          ) : (
            <>
              <div
                className={`flex flex-wrap items-center justify-between gap-2 text-xs${
                  embedded ? " text-[#6b7f96]" : " text-slate-500"
                }`}
              >
                <span>
                  {formatMessage(cityMessages.cityCount, {
                    count: filteredCities.length,
                    selected: selectedCount,
                  })}
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className={
                    embedded
                      ? "font-medium text-[var(--profile-primary)] hover:underline"
                      : "text-blue-400 hover:text-blue-300"
                  }
                >
                  {allFilteredSelected ? cityMessages.deselectAll : cityMessages.selectAll}
                </button>
              </div>

              <ul
                className={
                  embedded
                    ? "profile-owner-table max-h-[min(28rem,60vh)] divide-y overflow-y-auto scrollbar-thin"
                    : "max-h-[min(28rem,60vh)] divide-y divide-slate-800 overflow-y-auto rounded-xl border border-slate-700 scrollbar-thin"
                }
              >
                {filteredCities.map((city) => {
                  const displayName = canonicalCityName(city.country_code, city.city_name);
                  const countryName = getCountryName(city.country_code);
                  const visitSummary = formatVisitDatesSummary(
                    city.visit_dates ?? [],
                    (count) => translateCity("visitCount", { count }),
                    getIntlLocale()
                  );
                  const citySlug =
                    findCityHubSlug(city.country_code, displayName) ?? buildCitySlug(displayName);
                  const countrySlug = resolveCountryHubSlug(city.country_code, countryName);
                  const fullTitle =
                    countryFilter === ALL_COUNTRIES
                      ? `${displayName}, ${countryName}`
                      : displayName;
                  const checked = selectedIds.has(city.id);

                  return (
                    <li
                      key={city.id}
                      className={`flex items-center justify-between gap-3 px-4 py-3${embedded ? " profile-owner-table-row" : ""}`}
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={deleting}
                          onChange={() => toggleCity(city.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/40 disabled:opacity-60"
                          aria-label={displayName}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate font-medium ${embedded ? "profile-owner-show-primary" : "text-white"}`}
                            title={fullTitle}
                          >
                            <ProfileCityLink
                              slug={citySlug}
                              name={displayName}
                              className={ownerHubLinkClass(embedded)}
                              title={displayName}
                            />
                            {countryFilter === ALL_COUNTRIES ? (
                              <>
                                <span
                                  className={
                                    embedded
                                      ? "profile-owner-show-secondary"
                                      : "font-normal text-slate-400"
                                  }
                                >
                                  ,{" "}
                                </span>
                                <ProfileCountryLink
                                  slug={countrySlug}
                                  name={countryName}
                                  className={ownerHubLinkClass(embedded, true)}
                                  title={countryName}
                                />
                              </>
                            ) : null}
                          </span>
                          {visitSummary ? (
                            <span className="mt-0.5 block text-xs text-slate-500">{visitSummary}</span>
                          ) : city.media_type ? (
                            <span className="mt-0.5 block text-xs text-slate-500 capitalize">
                              {city.media_type}
                            </span>
                          ) : null}
                        </span>
                      </label>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(city.id)}
                          disabled={deleting}
                          className={
                            embedded
                              ? "profile-destination-card-actions__btn"
                              : "text-sm text-blue-400 hover:text-blue-300 disabled:opacity-60"
                          }
                        >
                          {commonMessages.edit}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                onClick={() => void handleDeleteSelected()}
                disabled={deleting || selectedCount === 0}
                className={
                  embedded
                    ? "w-full rounded-xl bg-[#dc2626] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-50"
                    : "w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                }
              >
                {deleting
                  ? commonMessages.loading
                  : selectedCount > 0
                    ? formatMessage(cityMessages.deleteSelectedCount, { count: selectedCount })
                    : cityMessages.deleteSelected}
              </button>
            </>
          )}
        </>
      )}
      {editingCity ? (
        <ProfileDestinationEditModal
          city={editingCity}
          park={null}
          visitedCountries={countries}
          onClose={() => setEditingId(null)}
        />
      ) : null}
    </section>
  );
}
