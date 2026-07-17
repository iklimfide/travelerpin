"use client";

import { useEffect, useMemo, useState } from "react";
import { ParkForm } from "@/components/dashboard/ParkForm";
import { ProfileDestinationEditModal } from "@/components/profile/ProfileDestinationEditModal";
import { ProfileCountryLink, ProfileParkLink } from "@/components/profile/ProfilePlaceLink";
import { useModal } from "@/components/ui/ModalProvider";
import { deleteParksBatch } from "@/lib/client/park-actions";
import { resolveCountryHubSlug } from "@/lib/data/country-hubs";
import { findParkHubSlug } from "@/lib/data/park-hubs";
import { formatMessage, useAppMessages } from "@/lib/i18n/client-messages";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { parkTypeLabel } from "@/lib/utils/park-type";
import type { VisitedCountry, VisitedPark } from "@/types/database";

const ALL_COUNTRIES = "ALL";

const ownerHubLinkClass = (embedded: boolean, muted = false) =>
  [
    "profile-owner-hub-link",
    embedded && muted ? "profile-owner-hub-link--muted" : "",
    !embedded && muted ? "font-normal text-slate-400" : "",
  ]
    .filter(Boolean)
    .join(" ");

type ParkListProps = {
  parks: VisitedPark[];
  countries: VisitedCountry[];
  embedded?: boolean;
};

function sortParks(parks: VisitedPark[], countryFilter: string): VisitedPark[] {
  return [...parks].sort((a, b) => {
    if (countryFilter === ALL_COUNTRIES) {
      const byCountry = a.country_name.localeCompare(b.country_name, undefined, {
        sensitivity: "base",
      });
      if (byCountry !== 0) return byCountry;
    }
    const byType = a.park_type.localeCompare(b.park_type);
    if (byType !== 0) return byType;
    return a.park_name.localeCompare(b.park_name, undefined, { sensitivity: "base" });
  });
}

export function ParkList({ parks, countries, embedded = false }: ParkListProps) {
  const { common: commonMessages, park: parkMessages, modal: modalMessages } = useAppMessages();
  const modal = useModal();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [countryFilter, setCountryFilter] = useState(ALL_COUNTRIES);

  const canAddPark = countries.length > 0;

  const countryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const park of parks) {
      const code = park.country_code.toUpperCase();
      if (!map.has(code)) {
        map.set(code, park.country_name);
      }
    }
    return [...map.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [parks]);

  const filteredParks = useMemo(() => {
    const list =
      countryFilter === ALL_COUNTRIES
        ? parks
        : parks.filter((park) => park.country_code.toUpperCase() === countryFilter);

    return sortParks(list, countryFilter);
  }, [parks, countryFilter]);

  const selectedCount = useMemo(
    () => filteredParks.filter((park) => selectedIds.has(park.id)).length,
    [filteredParks, selectedIds]
  );
  const allFilteredSelected =
    filteredParks.length > 0 && selectedCount === filteredParks.length;

  useEffect(() => {
    const visible = new Set(filteredParks.map((park) => park.id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (visible.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [filteredParks]);

  function togglePark(id: string) {
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
        for (const park of filteredParks) next.delete(park.id);
        return next;
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const park of filteredParks) next.add(park.id);
      return next;
    });
  }

  async function handleDeleteSelected() {
    const ids = filteredParks
      .filter((park) => selectedIds.has(park.id))
      .map((park) => park.id);
    if (ids.length === 0 || deleting) return;

    const confirmed = await modal.confirm(
      ids.length === 1
        ? modalMessages.deleteParkMessage
        : parkMessages.deleteSelectedMessage,
      {
        title:
          ids.length === 1
            ? modalMessages.deleteParkTitle
            : parkMessages.deleteSelectedTitle,
        destructive: true,
      }
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const result = await deleteParksBatch({ ids });
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
      <ParkForm
        visitedCountries={countries}
        existingParks={parks}
        onSuccess={() => setAdding(false)}
        onCancel={() => setAdding(false)}
      />
    );
  }

  const editingPark = parks.find((p) => p.id === editingId);

  return (
    <section className={`flex min-w-0 max-w-full flex-col gap-4${embedded ? " profile-owner-edit-surface" : ""}`}>
      {!embedded ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <h2 className="min-w-0 dashboard-section-title-park">
            {parkMessages.title}
            <span className="ml-2 text-sm font-normal text-slate-500">
              · {parkMessages.visitedOnly}
            </span>
          </h2>
          {canAddPark ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="dashboard-btn-add-park"
            >
              + {parkMessages.add}
            </button>
          ) : null}
        </div>
      ) : null}

      {!canAddPark ? (
        <p className={embedded ? "profile-owner-empty" : "text-sm text-slate-500"}>
          {parkMessages.addCountryFirst}
        </p>
      ) : parks.length === 0 ? (
        <p className={embedded ? "profile-owner-empty" : "text-sm text-slate-500"}>{parkMessages.empty}</p>
      ) : (
        <>
          {countryOptions.length > 1 ? (
            <div className="max-w-xs">
              <label
                htmlFor="park-list-country-filter"
                className={embedded ? "profile-owner-label" : "mb-1.5 block text-sm text-slate-400"}
              >
                {parkMessages.filterByCountry}
              </label>
              <select
                id="park-list-country-filter"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className={embedded ? "profile-owner-input w-full" : "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"}
              >
                <option value={ALL_COUNTRIES}>{parkMessages.allCountries}</option>
                {countryOptions.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {filteredParks.length === 0 ? (
            <p className={embedded ? "profile-owner-empty" : "text-sm text-slate-500"}>
              {parkMessages.noParksInCountry}
            </p>
          ) : (
            <>
              <div
                className={`flex flex-wrap items-center justify-between gap-2 text-xs${
                  embedded ? " text-[#6b7f96]" : " text-slate-500"
                }`}
              >
                <span>
                  {formatMessage(parkMessages.parkCount, {
                    count: filteredParks.length,
                    selected: selectedCount,
                  })}
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className={
                    embedded
                      ? "font-medium text-[var(--profile-primary)] hover:underline"
                      : "text-emerald-400 hover:text-emerald-300"
                  }
                >
                  {allFilteredSelected ? parkMessages.deselectAll : parkMessages.selectAll}
                </button>
              </div>

              <ul
                className={
                  embedded
                    ? "profile-owner-table max-h-[min(28rem,60vh)] divide-y overflow-y-auto scrollbar-thin"
                    : "max-h-[min(28rem,60vh)] divide-y divide-slate-800 overflow-y-auto rounded-xl border border-slate-700 scrollbar-thin"
                }
              >
                {filteredParks.map((park) => {
                  const parkDisplayName = formatCityDisplayName(park.park_name);
                  const parkSlug = findParkHubSlug(park.park_name, park.country_code);
                  const countrySlug = resolveCountryHubSlug(park.country_code, park.country_name);
                  const fullTitle =
                    countryFilter === ALL_COUNTRIES
                      ? `${parkDisplayName}, ${park.country_name}`
                      : parkDisplayName;
                  const checked = selectedIds.has(park.id);

                  return (
                    <li
                      key={park.id}
                      className={`flex items-center justify-between gap-3 px-4 py-3${embedded ? " profile-owner-table-row" : ""}`}
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={deleting}
                          onChange={() => togglePark(park.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/40 disabled:opacity-60"
                          aria-label={parkDisplayName}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate font-medium ${embedded ? "profile-owner-show-primary" : "text-white"}`}
                            title={fullTitle}
                          >
                            <ProfileParkLink
                              slug={parkSlug}
                              name={parkDisplayName}
                              className={ownerHubLinkClass(embedded)}
                              title={parkDisplayName}
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
                                  name={park.country_name}
                                  className={ownerHubLinkClass(embedded, true)}
                                  title={park.country_name}
                                />
                              </>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {parkTypeLabel(park.park_type)}
                          </span>
                        </span>
                      </label>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(park.id)}
                          disabled={deleting}
                          className={
                            embedded
                              ? "profile-destination-card-actions__btn"
                              : "text-sm text-emerald-400 hover:text-emerald-300 disabled:opacity-60"
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
                    ? formatMessage(parkMessages.deleteSelectedCount, { count: selectedCount })
                    : parkMessages.deleteSelected}
              </button>
            </>
          )}
        </>
      )}
      {editingPark ? (
        <ProfileDestinationEditModal
          city={null}
          park={editingPark}
          visitedCountries={countries}
          onClose={() => setEditingId(null)}
        />
      ) : null}
    </section>
  );
}
