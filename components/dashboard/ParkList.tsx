"use client";

import { useMemo, useState } from "react";
import { ParkForm } from "@/components/dashboard/ParkForm";
import { ProfileDestinationCardActions } from "@/components/profile/ProfileDestinationCardActions";
import { ProfileDestinationEditModal } from "@/components/profile/ProfileDestinationEditModal";
import { ProfileCountryLink, ProfileParkLink } from "@/components/profile/ProfilePlaceLink";
import { useModal } from "@/components/ui/ModalProvider";
import { resolveCountryHubSlug } from "@/lib/data/country-hubs";
import { findParkHubSlug } from "@/lib/data/park-hubs";
import { notifyProfileDataChanged } from "@/lib/client/session-page-cache";
import { commonMessages, modalMessages, parkMessages } from "@/lib/i18n/client-messages";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { parkTypeLabel } from "@/lib/utils/park-type";
import type { ParkType, VisitedCountry, VisitedPark } from "@/types/database";

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
  const modal = useModal();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
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

  async function handleDelete(id: string) {
    const confirmed = await modal.confirm(modalMessages.deleteParkMessage, {
      title: modalMessages.deleteParkTitle,
      destructive: true,
    });
    if (!confirmed) return;

    const res = await fetch(`/api/parks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      if (res.status === 404) {
        notifyProfileDataChanged();
        return;
      }
      const data = await res.json();
      await modal.alert(data.error ?? "Failed to delete park", { variant: "error" });
      return;
    }
    notifyProfileDataChanged();
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

                return (
                <li
                  key={park.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3${embedded ? " profile-owner-table-row" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate font-medium ${embedded ? "profile-owner-show-primary" : "text-white"}`}
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
                          <span className={embedded ? "profile-owner-show-secondary" : "font-normal text-slate-400"}>
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
                    </p>
                    <p className="text-xs text-slate-500">
                      {parkTypeLabel(park.park_type)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {embedded ? (
                      <ProfileDestinationCardActions
                        onEdit={() => setEditingId(park.id)}
                        onRemove={() => handleDelete(park.id)}
                        editLabel={commonMessages.edit}
                        removeLabel={commonMessages.delete}
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(park.id)}
                          className="text-sm text-emerald-400 hover:text-emerald-300"
                        >
                          {commonMessages.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(park.id)}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          {commonMessages.delete}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
              })}
            </ul>
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
