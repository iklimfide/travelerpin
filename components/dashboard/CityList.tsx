"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CityForm } from "@/components/dashboard/CityForm";
import { ProfileDestinationCardActions } from "@/components/profile/ProfileDestinationCardActions";
import { ProfileDestinationEditModal } from "@/components/profile/ProfileDestinationEditModal";
import { useModal } from "@/components/ui/ModalProvider";
import {
  cityMessages,
  commonMessages,
  modalMessages,
  translateCity,
} from "@/lib/i18n/client-messages";
import { formatVisitDatesSummary } from "@/lib/utils/visit-date";
import { getIntlLocale } from "@/lib/i18n/config";
import type { VisitedCity, VisitedCountry } from "@/types/database";

const ALL_COUNTRIES = "ALL";

type CityListProps = {
  cities: VisitedCity[];
  countries: VisitedCountry[];
  embedded?: boolean;
};

function sortCities(cities: VisitedCity[], countryFilter: string): VisitedCity[] {
  return [...cities].sort((a, b) => {
    if (countryFilter === ALL_COUNTRIES) {
      const byCountry = a.country_name.localeCompare(b.country_name, undefined, {
        sensitivity: "base",
      });
      if (byCountry !== 0) return byCountry;
    }
    return a.city_name.localeCompare(b.city_name, undefined, { sensitivity: "base" });
  });
}

export function CityList({ cities, countries, embedded = false }: CityListProps) {
  const router = useRouter();
  const modal = useModal();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [countryFilter, setCountryFilter] = useState(ALL_COUNTRIES);

  const canAddCity = countries.length > 0;

  const countryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const city of cities) {
      const code = city.country_code.toUpperCase();
      if (!map.has(code)) {
        map.set(code, city.country_name);
      }
    }
    return [...map.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [cities]);

  const filteredCities = useMemo(() => {
    const list =
      countryFilter === ALL_COUNTRIES
        ? cities
        : cities.filter((city) => city.country_code.toUpperCase() === countryFilter);

    return sortCities(list, countryFilter);
  }, [cities, countryFilter]);

  async function handleDelete(id: string) {
    const confirmed = await modal.confirm(modalMessages.deleteCityMessage, {
      title: modalMessages.deleteCityTitle,
      destructive: true,
    });
    if (!confirmed) return;

    const res = await fetch(`/api/cities/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      await modal.alert(data.error ?? "Failed to delete city", { variant: "error" });
      return;
    }
    router.refresh();
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
          {countryOptions.length > 1 ? (
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
            <ul
              className={
                embedded
                  ? "profile-owner-table max-h-[min(28rem,60vh)] divide-y overflow-y-auto scrollbar-thin"
                  : "max-h-[min(28rem,60vh)] divide-y divide-slate-800 overflow-y-auto rounded-xl border border-slate-700 scrollbar-thin"
              }
            >
              {filteredCities.map((city) => {
                const visitSummary = formatVisitDatesSummary(
                  city.visit_dates ?? [],
                  (count) => translateCity("visitCount", { count }),
                  getIntlLocale()
                );

                return (
                <li
                  key={city.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3${embedded ? " profile-owner-table-row" : ""}`}
                >
                  <div className="min-w-0">
                    <p className={`truncate font-medium ${embedded ? "profile-owner-show-primary" : "text-white"}`}>
                      {city.city_name}
                      {countryFilter === ALL_COUNTRIES ? (
                        <span className="font-normal text-slate-400">, {city.country_name}</span>
                      ) : null}
                    </p>
                    {visitSummary ? (
                      <p className="text-xs text-slate-500">{visitSummary}</p>
                    ) : city.media_type ? (
                      <p className="text-xs text-slate-500 capitalize">{city.media_type}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {embedded ? (
                      <ProfileDestinationCardActions
                        onEdit={() => setEditingId(city.id)}
                        onRemove={() => handleDelete(city.id)}
                        editLabel={commonMessages.edit}
                        removeLabel={commonMessages.delete}
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(city.id)}
                          className="text-sm text-blue-400 hover:text-blue-300"
                        >
                          {commonMessages.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(city.id)}
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
