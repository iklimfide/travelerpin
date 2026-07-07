"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMapFocus } from "@/components/map/MapFocusContext";
import { commonMessages, formatMessage, parkMessages, profileMessages } from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";
import { computeRepeatVisitSummary } from "@/lib/utils/stats";
import {
  buildVisitedCityList,
  buildVisitedCountryList,
} from "@/lib/map/travel-lists";
import { buildVisitedParkList } from "@/lib/map/park-lists";
import { isNaturaParkType, isThemeParkType } from "@/lib/utils/park-type";
import type {
  TravelStats,
  VisitedCity,
  VisitedCountry,
  VisitedPark,
  WishlistCountry,
} from "@/types/database";

type TravelStatsInteractiveProps = {
  stats: TravelStats;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks?: VisitedPark[];
  wishlistCountries?: WishlistCountry[];
  displayName?: string;
  username?: string;
  className?: string;
};

type OpenPanel =
  | "countries"
  | "cities"
  | "nationalParks"
  | "themeParks"
  | "wishlist"
  | null;

type StatButtonProps = {
  value: number;
  label: string;
  panel: Exclude<OpenPanel, null | "wishlist">;
  openPanel: OpenPanel;
  onToggle: (panel: Exclude<OpenPanel, null | "wishlist">) => void;
  segmentClass: string;
};

function StatButton({
  value,
  label,
  panel,
  openPanel,
  onToggle,
  segmentClass,
}: StatButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(panel)}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2.5 sm:flex-row sm:gap-2 sm:px-2 sm:py-1 ${segmentClass}`}
      aria-expanded={openPanel === panel}
    >
      <span className="text-xl font-bold leading-none text-foreground sm:text-2xl">{value}</span>
      <span className="max-w-full truncate text-center text-[10px] font-medium leading-tight text-blue-700 dark:text-blue-200 sm:text-sm">
        {label}
      </span>
    </button>
  );
}

function DesktopStatPill({
  value,
  label,
  panel,
  openPanel,
  onToggle,
}: Omit<StatButtonProps, "segmentClass">) {
  return (
    <button
      type="button"
      onClick={() => onToggle(panel)}
      className="flex h-12 w-[5.25rem] shrink-0 flex-col items-center justify-center rounded-xl border border-[#93c5fd] bg-[#dbeafe] px-1 py-1.5 transition-colors hover:bg-[#bfdbfe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/40 xl:w-[5.5rem]"
      aria-expanded={openPanel === panel}
    >
      <span className="text-base font-bold leading-none text-[#0f172a]">{value}</span>
      <span className="mt-1 whitespace-nowrap text-[8px] font-bold leading-none text-[#2563eb] xl:text-[9px]">
        {label}
      </span>
    </button>
  );
}

export function TravelStatsInteractive({
  stats,
  visitedCountries,
  visitedCities,
  visitedParks = [],
  wishlistCountries = [],
  displayName,
  username,
  className = "",
}: TravelStatsInteractiveProps) {
  const t = commonMessages;
  const p = profileMessages;
  const parks = parkMessages;
  const { focusCountry } = useMapFocus();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const countries = useMemo(
    () => buildVisitedCountryList(visitedCountries, visitedCities, [], visitedParks),
    [visitedCountries, visitedCities, visitedParks]
  );

  const cities = useMemo(() => buildVisitedCityList(visitedCities), [visitedCities]);

  const nationalParks = useMemo(
    () => buildVisitedParkList(visitedParks.filter((park) => isNaturaParkType(park.park_type))),
    [visitedParks]
  );

  const themeParks = useMemo(
    () => buildVisitedParkList(visitedParks.filter((park) => isThemeParkType(park.park_type))),
    [visitedParks]
  );

  const wishlist = useMemo(
    () =>
      [...wishlistCountries]
        .map((country) => ({
          code: country.country_code,
          name: country.country_name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [wishlistCountries]
  );

  const repeatVisitSummary = useMemo(() => {
    const { countriesVisitedMoreThanOnce, citiesVisitedMoreThanOnce } =
      computeRepeatVisitSummary(visitedCountries, visitedCities, visitedParks);

    if (countriesVisitedMoreThanOnce === 0 && citiesVisitedMoreThanOnce === 0) {
      return null;
    }

    if (countriesVisitedMoreThanOnce > 0 && citiesVisitedMoreThanOnce > 0) {
      return formatMessage(profileMessages.repeatVisitsBoth, {
        countries: countriesVisitedMoreThanOnce,
        cities: citiesVisitedMoreThanOnce,
      });
    }

    if (countriesVisitedMoreThanOnce > 0) {
      return formatMessage(profileMessages.repeatVisitsCountriesOnly, {
        countries: countriesVisitedMoreThanOnce,
      });
    }

    return formatMessage(profileMessages.repeatVisitsCitiesOnly, {
      cities: citiesVisitedMoreThanOnce,
    });
  }, [visitedCountries, visitedCities, visitedParks]);

  useEffect(() => {
    if (!openPanel) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpenPanel(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenPanel(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openPanel]);

  function togglePanel(panel: Exclude<OpenPanel, null>) {
    setOpenPanel((current) => (current === panel ? null : panel));
  }

  function handleCountrySelect(country: { code: string; name: string }) {
    setOpenPanel(null);
    focusCountry(country);
  }

  function handleCitySelect(city: {
    country_code: string;
    country_name: string;
    city_name: string;
  }) {
    setOpenPanel(null);
    focusCountry({ code: city.country_code, name: city.country_name });
  }

  function handleParkSelect(park: VisitedPark) {
    setOpenPanel(null);
    focusCountry({ code: park.country_code, name: park.country_name });
  }

  const visitedSegmentClass =
    "rounded-lg transition-colors hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 sm:rounded-full";

  const wishlistSegmentClass =
    "rounded-full px-2 py-0.5 transition-colors hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50";

  const panelTitle =
    openPanel === "countries"
      ? t.visitedCountries
      : openPanel === "cities"
        ? t.visitedCities
        : openPanel === "nationalParks"
          ? parks.visitedNationalParks
          : openPanel === "themeParks"
            ? parks.visitedThemeParks
            : openPanel === "wishlist"
              ? p.wishlistCountries
              : "";

  const panelEmpty =
    openPanel === "countries"
      ? countries.length === 0
      : openPanel === "cities"
        ? cities.length === 0
        : openPanel === "nationalParks"
          ? nationalParks.length === 0
          : openPanel === "themeParks"
            ? themeParks.length === 0
            : openPanel === "wishlist"
              ? wishlist.length === 0
              : true;

  return (
    <div
      ref={rootRef}
      className={`relative w-full min-w-0 max-w-none sm:max-w-none ${className}`}
    >
      <div className="flex flex-col items-stretch gap-2 sm:items-center">
        {/* Mobile + tablet — unchanged */}
        <div className="overflow-hidden rounded-2xl border border-blue-500/30 bg-blue-500/10 sm:inline-flex sm:items-center sm:gap-3 sm:rounded-full sm:px-4 sm:py-3 lg:hidden">
          <div className="grid grid-cols-2 divide-x divide-blue-500/15 sm:flex sm:items-center sm:divide-x-0">
            <StatButton
              value={stats.countries}
              label={t.countries}
              panel="countries"
              openPanel={openPanel}
              onToggle={togglePanel}
              segmentClass={visitedSegmentClass}
            />
            <StatButton
              value={stats.cities}
              label={t.cities}
              panel="cities"
              openPanel={openPanel}
              onToggle={togglePanel}
              segmentClass={visitedSegmentClass}
            />
          </div>

          <div
            className="hidden h-8 w-px shrink-0 bg-blue-500/25 sm:block"
            aria-hidden
          />

          <div className="grid grid-cols-2 divide-x divide-blue-500/15 border-t border-blue-500/15 sm:flex sm:items-center sm:border-t-0 sm:divide-x-0">
            <StatButton
              value={stats.nationalParks}
              label={parks.nationalParksShort}
              panel="nationalParks"
              openPanel={openPanel}
              onToggle={togglePanel}
              segmentClass={visitedSegmentClass}
            />
            <StatButton
              value={stats.themeParks}
              label={parks.themeParksShort}
              panel="themeParks"
              openPanel={openPanel}
              onToggle={togglePanel}
              segmentClass={visitedSegmentClass}
            />
          </div>
        </div>

        {/* Desktop — full labels, equal-height pills */}
        <div className="hidden shrink-0 items-stretch gap-1.5 lg:flex xl:gap-2">
          <DesktopStatPill
            value={stats.countries}
            label={t.countries}
            panel="countries"
            openPanel={openPanel}
            onToggle={togglePanel}
          />
          <DesktopStatPill
            value={stats.cities}
            label={t.cities}
            panel="cities"
            openPanel={openPanel}
            onToggle={togglePanel}
          />
          <DesktopStatPill
            value={stats.nationalParks}
            label={t.nationalParks}
            panel="nationalParks"
            openPanel={openPanel}
            onToggle={togglePanel}
          />
          <DesktopStatPill
            value={stats.themeParks}
            label={t.themeParks}
            panel="themeParks"
            openPanel={openPanel}
            onToggle={togglePanel}
          />
        </div>

        {repeatVisitSummary ? (
          <p className="w-full text-center text-sm leading-relaxed text-slate-400 lg:text-right">
            {displayName && username ? (
              <>
                <Link
                  href={profilePath(username)}
                  className="font-medium text-blue-400 hover:text-blue-300"
                >
                  {displayName}
                </Link>{" "}
                {repeatVisitSummary}
              </>
            ) : (
              repeatVisitSummary
            )}
          </p>
        ) : null}

        {wishlist.length > 0 && (
          <div className="flex justify-center lg:justify-end">
            <div className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1">
              <button
                type="button"
                onClick={() => togglePanel("wishlist")}
                className={`inline-flex items-center gap-1.5 ${wishlistSegmentClass}`}
                aria-expanded={openPanel === "wishlist"}
              >
                <span className="text-sm font-bold leading-none text-foreground">
                  {wishlist.length}
                </span>
                <span className="text-[10px] font-medium leading-none text-amber-800 dark:text-amber-200 sm:text-xs">
                  {p.wishlistCountries}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {openPanel && (
        <div className="absolute left-0 right-0 top-full z-30 mx-auto mt-2 w-full max-w-xs overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl sm:left-1/2 sm:right-auto sm:w-[min(100%,20rem)] sm:-translate-x-1/2">
          <div className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {panelTitle}
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {panelEmpty ? (
              <li className="px-3 py-2 text-sm text-slate-500">{t.statsListEmpty}</li>
            ) : openPanel === "countries" ? (
              countries.map((country) => (
                <li key={country.code}>
                  <button
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
                  >
                    {country.name}
                  </button>
                </li>
              ))
            ) : openPanel === "cities" ? (
              cities.map((city) => (
                <li key={city.id}>
                  <button
                    type="button"
                    onClick={() => handleCitySelect(city)}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
                  >
                    <span className="font-medium">{city.city_name}</span>
                    <span className="text-slate-500"> · {city.country_name}</span>
                  </button>
                </li>
              ))
            ) : openPanel === "nationalParks" ? (
              nationalParks.map((park) => (
                <li key={park.id}>
                  <button
                    type="button"
                    onClick={() => handleParkSelect(park)}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
                  >
                    <span className="font-medium">{park.park_name}</span>
                    <span className="text-slate-500"> · {park.country_name}</span>
                  </button>
                </li>
              ))
            ) : openPanel === "themeParks" ? (
              themeParks.map((park) => (
                <li key={park.id}>
                  <button
                    type="button"
                    onClick={() => handleParkSelect(park)}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
                  >
                    <span className="font-medium">{park.park_name}</span>
                    <span className="text-slate-500"> · {park.country_name}</span>
                  </button>
                </li>
              ))
            ) : (
              wishlist.map((country) => (
                <li key={country.code}>
                  <button
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
                  >
                    {country.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
