"use client";

import { useEffect, useMemo, useState } from "react";
import { COUNTRY_LIST } from "@/lib/data/countries";
import { translateCommon, translateSettings } from "@/lib/i18n/client-messages";
import { formatCityDisplayName, normalizeCityKey } from "@/lib/utils/city-name";

export type ResidenceCitySelection = {
  city_name: string;
  country_code: string;
  country_name: string;
  latitude?: number | null;
  longitude?: number | null;
};

type CitySearchResult = {
  cityName: string;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
};

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

type ResidenceCityPickerProps = {
  /** Current profile residence label (used to hydrate selection on load). */
  initialResidence?: string | null;
  value: ResidenceCitySelection | null;
  onChange: (value: ResidenceCitySelection | null) => void;
  disabled?: boolean;
  /** API path for city search (default: authenticated destinations search). */
  searchPath?: string;
  /** Show "Remove" to clear home label (off on registration). */
  allowClear?: boolean;
  tone?: "dark" | "light";
};

export function ResidenceCityPicker({
  initialResidence,
  value,
  onChange,
  disabled = false,
  searchPath = "/api/destinations/search",
  allowClear = true,
  tone = "dark",
}: ResidenceCityPickerProps) {
  const t = translateSettings;
  const tCommon = translateCommon;
  const isLight = tone === "light";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [completedQuery, setCompletedQuery] = useState("");
  const [customCountry, setCustomCountry] = useState("TR");
  const [hydrated, setHydrated] = useState(false);

  const customCountryName = useMemo(
    () => COUNTRY_LIST.find((country) => country.code === customCountry)?.name ?? "",
    [customCountry]
  );

  // Hydrate existing residence into a full city selection (same as add-city payload).
  useEffect(() => {
    if (hydrated || value || !initialResidence?.trim()) {
      setHydrated(true);
      return;
    }

    let cancelled = false;
    const label = initialResidence.trim();

    async function hydrate() {
      try {
        const params = new URLSearchParams({ q: label.split(",")[0]?.trim() || label });
        const res = await fetch(`${searchPath}?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        const cities = (data.cities as CitySearchResult[] | undefined) ?? [];
        const needle = normalizeCityKey(label.split(",")[0] ?? label);
        const match =
          cities.find((city) => normalizeCityKey(city.cityName) === needle) ?? cities[0];
        if (!cancelled && match) {
          onChange({
            city_name: match.cityName,
            country_code: match.countryCode,
            country_name: match.countryName,
            latitude: match.latitude,
            longitude: match.longitude,
          });
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [hydrated, initialResidence, onChange, searchPath, value]);

  useEffect(() => {
    if (value) return;

    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setCompletedQuery("");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setCompletedQuery("");

    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q });
        const res = await fetch(`${searchPath}?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = await res.json();
        setResults((data.cities as CitySearchResult[] | undefined) ?? []);
        setCompletedQuery(q);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResults([]);
        setCompletedQuery(q);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, searchPath, value]);

  function selectCity(city: CitySearchResult) {
    onChange({
      city_name: city.cityName,
      country_code: city.countryCode,
      country_name: city.countryName,
      latitude: city.latitude,
      longitude: city.longitude,
    });
    setQuery("");
    setResults([]);
    setCompletedQuery("");
  }

  function selectCustomCity() {
    const cityName = formatCityDisplayName(query.trim());
    if (!cityName || !customCountryName) return;
    onChange({
      city_name: cityName,
      country_code: customCountry,
      country_name: customCountryName,
      latitude: null,
      longitude: null,
    });
    setQuery("");
    setResults([]);
    setCompletedQuery("");
  }

  if (value) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span
            className={
              isLight
                ? "inline-flex min-w-0 flex-1 items-center gap-2 rounded-full border border-wbs-blue/25 bg-wbs-blue/10 px-3 py-1.5 text-sm font-semibold text-wbs-blue"
                : "inline-flex min-w-0 flex-1 items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-sm font-semibold text-blue-300"
            }
          >
            <span aria-hidden className="shrink-0">📍</span>
            <span className="truncate">
              {value.city_name}, {value.country_name}
            </span>
          </span>
          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                // Clear selection so the search UI opens — user picks a new home city.
                onChange(null);
                setQuery(value.city_name);
              }}
              className={`text-sm underline-offset-2 hover:underline disabled:opacity-50 ${
                isLight
                  ? "text-slate-500 hover:text-slate-700"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t("residenceChange")}
            </button>
            {allowClear ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  // Clear home label only — city pin stays on the map.
                  onChange(null);
                  setQuery("");
                  setResults([]);
                  setCompletedQuery("");
                }}
                className={`text-sm underline-offset-2 hover:underline disabled:opacity-50 ${
                  isLight
                    ? "text-red-500 hover:text-red-600"
                    : "text-red-400/90 hover:text-red-300"
                }`}
              >
                {t("residenceRemove")}
              </button>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-slate-500">{t("residencePinHint")}</p>
      </div>
    );
  }

  const showCustom =
    !loading &&
    completedQuery === query.trim() &&
    query.trim().length >= MIN_QUERY_LENGTH &&
    results.length === 0;

  return (
    <div className="space-y-2">
      <input
        id="residence"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={
          isLight
            ? "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-wbs-blue focus:ring-1 focus:ring-wbs-blue/20"
            : "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none transition-[border-color,box-shadow] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25"
        }
        maxLength={100}
        placeholder={t("residencePlaceholder")}
        autoComplete="off"
        disabled={disabled}
      />
      <p className="text-xs text-slate-500">{t("residencePinHint")}</p>

      {query.trim().length >= MIN_QUERY_LENGTH ? (
        <>
          {loading || results.length > 0 ? (
            <ul
              className={
                isLight
                  ? "max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white scrollbar-thin"
                  : "max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg scrollbar-thin"
              }
            >
              {loading ? (
                <li className="px-3 py-3 text-center text-sm text-slate-500">
                  {tCommon("loading")}
                </li>
              ) : (
                results.map((city) => (
                  <li key={`${city.countryCode}:${city.cityName}`}>
                    <button
                      type="button"
                      disabled={disabled}
                      className={`flex w-full flex-col px-3 py-2.5 text-left disabled:opacity-50 ${
                        isLight ? "hover:bg-slate-50" : "hover:bg-blue-50"
                      }`}
                      onClick={() => selectCity(city)}
                    >
                      <span
                        className={`text-sm font-medium ${
                          isLight ? "text-slate-800" : "text-blue-600"
                        }`}
                      >
                        {city.cityName}
                      </span>
                      <span
                        className={`truncate text-xs ${
                          isLight ? "text-slate-500" : "text-blue-500/80"
                        }`}
                      >
                        {city.countryName}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}

          {showCustom ? (
            <div
              className={
                isLight
                  ? "rounded-lg border border-slate-200 bg-slate-50 p-3"
                  : "rounded-lg border border-slate-700 bg-slate-950 p-3"
              }
            >
              <p className={`text-sm ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                {t("residenceCustomHint", {
                  city: formatCityDisplayName(query.trim()),
                })}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select
                  value={customCountry}
                  onChange={(e) => setCustomCountry(e.target.value)}
                  disabled={disabled}
                  className={
                    isLight
                      ? "min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-wbs-blue focus:ring-1 focus:ring-wbs-blue/20"
                      : "min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none transition-[border-color,box-shadow] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25"
                  }
                >
                  {COUNTRY_LIST.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={disabled}
                  className="rounded-lg bg-wbs-blue px-4 py-2 text-sm font-semibold text-white hover:bg-wbs-blue-hover disabled:opacity-50"
                  onClick={selectCustomCity}
                >
                  {t("residenceCustomAdd")}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
