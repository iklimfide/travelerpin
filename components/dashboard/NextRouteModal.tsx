"use client";

import Image from "next/image";
import { SaveDestinationModalListSkeleton } from "@/components/skeletons/SaveDestinationModalSkeleton";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COUNTRY_LIST, searchCountries } from "@/lib/data/countries";
import { getPopularCountries } from "@/lib/data/popular-countries";
import { POPULAR_DESTINATIONS } from "@/lib/data/popular-destinations";
import { commonMessages, nextRouteMessages, saveDestinationMessages } from "@/lib/i18n/client-messages";
import {
  notifyNextRouteChanged,
  readOwnNextRouteCache,
} from "@/lib/client/session-page-cache";
import { fetchNextRoute } from "@/lib/client/next-route-state";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import {
  areNextRouteStopsEqual,
  buildCountryStop,
  buildCityStop,
  parseNextRoute,
  stopDedupeKey,
} from "@/lib/utils/next-route";
import type { NextRouteStop } from "@/types/database";

export type NextRouteModalTab = "countries" | "cities" | "route";

type NextRouteModalProps = {
  open: boolean;
  onClose: () => void;
  initialTab?: NextRouteModalTab;
};

type NextRouteTab = NextRouteModalTab;

type BrowseRow = {
  id: string;
  kind: "country" | "city";
  title: string;
  subtitle: string;
  countryCode: string;
  countryName: string;
  cityName?: string;
};

type SearchResult = {
  kind: "country" | "city";
  countryCode: string;
  countryName: string;
  cityName?: string;
};

function rowId(kind: "country" | "city", countryCode: string, cityName?: string): string {
  if (kind === "country") return `country:${countryCode}`.toLowerCase();
  return `${countryCode}:${cityName ?? ""}`.toLowerCase();
}

function stopKey(stop: NextRouteStop): string {
  return stopDedupeKey(stop);
}

function browseRowKey(row: BrowseRow): string {
  if (row.kind === "country") {
    return stopDedupeKey({ kind: "country", name: row.title, countryCode: row.countryCode });
  }
  return stopDedupeKey({
    kind: "city",
    name: row.cityName ?? row.title,
    countryCode: row.countryCode,
  });
}

function countryToRow(country: { code: string; name: string }): BrowseRow {
  return {
    id: rowId("country", country.code),
    kind: "country",
    title: country.name,
    subtitle: country.code,
    countryCode: country.code,
    countryName: country.name,
  };
}

function popularCityToRow(destination: (typeof POPULAR_DESTINATIONS)[number]): BrowseRow {
  return {
    id: rowId("city", destination.countryCode, destination.cityName),
    kind: "city",
    title: destination.label,
    subtitle: destination.countryName,
    countryCode: destination.countryCode,
    countryName: destination.countryName,
    cityName: destination.cityName,
  };
}

function searchToRow(result: SearchResult): BrowseRow {
  if (result.kind === "country") {
    return countryToRow({ code: result.countryCode, name: result.countryName });
  }
  return {
    id: rowId("city", result.countryCode, result.cityName!),
    kind: "city",
    title: result.cityName!,
    subtitle: result.countryName,
    countryCode: result.countryCode,
    countryName: result.countryName,
    cityName: result.cityName,
  };
}

function stopToRow(stop: NextRouteStop, index: number): BrowseRow & { index: number } {
  if (stop.kind === "country") {
    const code = stop.countryCode ?? "";
    const country =
      COUNTRY_LIST.find((entry) => entry.code === code) ??
      ({ code, name: stop.name } as const);
    return { ...countryToRow(country), index };
  }
  return {
    id: rowId("city", stop.countryCode ?? "", stop.name),
    kind: "city",
    title: stop.name,
    subtitle: stop.countryName ?? "",
    countryCode: stop.countryCode ?? "",
    countryName: stop.countryName ?? "",
    cityName: stop.name,
    index,
  };
}

function browseRowToSearchResult(row: BrowseRow): SearchResult {
  if (row.kind === "country") {
    return { kind: "country", countryCode: row.countryCode, countryName: row.countryName };
  }
  return {
    kind: "city",
    countryCode: row.countryCode,
    countryName: row.countryName,
    cityName: row.cityName,
  };
}

function buildStopFromResult(result: SearchResult): NextRouteStop {
  if (result.kind === "country") {
    return buildCountryStop(result.countryCode, result.countryName);
  }
  return buildCityStop(result.cityName!, result.countryCode, result.countryName);
}

export function NextRouteModal({ open, onClose, initialTab = "countries" }: NextRouteModalProps) {
  const cachedStops = readOwnNextRouteCache();
  const [stops, setStops] = useState<NextRouteStop[]>(() => cachedStops ?? []);
  const [tab, setTab] = useState<NextRouteTab>("countries");
  const [query, setQuery] = useState("");
  const [loadingRoute, setLoadingRoute] = useState(() => cachedStops === null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedStops, setSavedStops] = useState<NextRouteStop[]>(() => cachedStops ?? []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const hasRouteRef = useRef(cachedStops !== null);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length >= 2;

  const stopKeys = useMemo(() => new Set(stops.map(stopKey)), [stops]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, saving]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTab(initialTab);
    setSearchResults([]);
    setSaveError(null);

    const cached = readOwnNextRouteCache();
    if (cached !== null) {
      setStops(cached);
      setSavedStops(cached);
      hasRouteRef.current = true;
      setLoadingRoute(false);
      return;
    }

    const background = hasRouteRef.current;
    if (!background) {
      setLoadingRoute(true);
    }

    void fetchNextRoute({ preferCache: false, force: true })
      .then((result) => {
        if (!result.ok) {
          setStops([]);
          setSavedStops([]);
          return;
        }
        setStops(result.stops);
        setSavedStops(result.stops);
      })
      .finally(() => {
        hasRouteRef.current = true;
        setLoadingRoute(false);
      });
  }, [open, initialTab]);

  useEffect(() => {
    if (!open || !isSearching) {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }

    const controller = new AbortController();
    // Keep previous results visible while the next search loads.
    setLoadingSearch(true);

    const timer = window.setTimeout(() => {
      fetch(`/api/destinations/search?q=${encodeURIComponent(trimmedQuery)}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : { countries: [], cities: [] }))
        .then((data) => {
          const countryRows: SearchResult[] = (data.countries ?? []).map(
            (country: { code: string; name: string }) => ({
              kind: "country" as const,
              countryCode: country.code,
              countryName: country.name,
            })
          );
          const cityRows: SearchResult[] = (data.cities ?? []).map(
            (city: {
              cityName: string;
              countryCode: string;
              countryName: string;
            }) => ({
              kind: "city" as const,
              countryCode: city.countryCode,
              countryName: city.countryName,
              cityName: city.cityName,
            })
          );
          const localCountries = searchCountries(trimmedQuery, 8).map((country) => ({
            kind: "country" as const,
            countryCode: country.code,
            countryName: country.name,
          }));
          const merged = new Map<string, SearchResult>();
          for (const row of [...countryRows, ...localCountries, ...cityRows]) {
            const id =
              row.kind === "country"
                ? rowId("country", row.countryCode)
                : rowId("city", row.countryCode, row.cityName);
            merged.set(id, row);
          }
          setSearchResults([...merged.values()]);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSearchResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoadingSearch(false);
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, isSearching, trimmedQuery]);

  const hasUnsavedChanges = useMemo(
    () => !areNextRouteStopsEqual(stops, savedStops),
    [savedStops, stops]
  );

  const applyStops = useCallback((updater: (prev: NextRouteStop[]) => NextRouteStop[]) => {
    setSaveError(null);
    setStops((prev) => updater(prev));
  }, []);

  const handleSave = useCallback(async () => {
    if (saving || !hasUnsavedChanges) return;

    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/me/next-route", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops }),
      });

      if (!res.ok) {
        setSaveError(nextRouteMessages.saveFailed);
        return;
      }

      const data = (await res.json()) as { stops?: unknown };
      const saved = parseNextRoute(data.stops);
      setStops(saved);
      setSavedStops(saved);
      notifyNextRouteChanged(saved);
      onClose();
    } catch {
      setSaveError(nextRouteMessages.saveFailed);
    } finally {
      setSaving(false);
    }
  }, [hasUnsavedChanges, onClose, saving, stops]);

  const addToRoute = useCallback(
    (result: SearchResult) => {
      const key =
        result.kind === "country"
          ? stopDedupeKey({ kind: "country", name: result.countryName, countryCode: result.countryCode })
          : stopDedupeKey({
              kind: "city",
              name: result.cityName!,
              countryCode: result.countryCode,
            });
      if (stopKeys.has(key)) return;

      setBusyId(key);
      applyStops((prev) => [...prev, buildStopFromResult(result)]);
      setBusyId(null);
    },
    [applyStops, stopKeys]
  );

  const removeFromRoute = useCallback(
    (key: string) => {
      setBusyId(key);
      applyStops((prev) => prev.filter((stop) => stopKey(stop) !== key));
      setBusyId(null);
    },
    [applyStops]
  );

  const moveStop = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      applyStops((prev) => {
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        const [item] = next.splice(index, 1);
        next.splice(target, 0, item!);
        return next;
      });
    },
    [applyStops]
  );

  const browseRows = useMemo((): BrowseRow[] => {
    if (tab === "countries") {
      return getPopularCountries(40).map(countryToRow);
    }
    if (tab === "cities") {
      return POPULAR_DESTINATIONS.filter((destination) => destination.kind === "city")
        .slice(0, 40)
        .map(popularCityToRow);
    }
    return [];
  }, [tab]);

  const listRows = useMemo(() => {
    if (isSearching) return searchResults.map(searchToRow);
    if (tab === "route") return stops.map(stopToRow);
    return browseRows;
  }, [browseRows, isSearching, searchResults, stops, tab]);

  const statusLabel = useMemo(() => {
    if (isSearching && loadingSearch) return nextRouteMessages.searching;
    return nextRouteMessages.routeStopCount.replace("{count}", String(stops.length));
  }, [isSearching, loadingSearch, stops.length]);

  const showRouteTabAction = !(isSearching && loadingSearch);

  function goToMyRouteTab() {
    setQuery("");
    setTab("route");
  }

  const showListSkeleton = loadingRoute && tab === "route" && !isSearching;

  const listSkeletonVariant = tab === "route" && !isSearching ? "route" : "browse";

  const listEmptyMessage = useMemo(() => {
    if (showListSkeleton) return null;
    if (isSearching) {
      if (loadingSearch) return null;
      if (trimmedQuery.length < 2) return nextRouteMessages.searchIdle;
      return listRows.length === 0 ? nextRouteMessages.searchEmpty : null;
    }
    if (tab === "route" && stops.length === 0) return nextRouteMessages.emptyRoute;
    return null;
  }, [isSearching, listRows.length, loadingSearch, showListSkeleton, stops.length, tab, trimmedQuery.length]);

  if (!open) return null;

  const tabs: { id: NextRouteTab; label: string; icon: string }[] = [
    { id: "countries", label: saveDestinationMessages.tabCountries, icon: "🌍" },
    { id: "cities", label: saveDestinationMessages.tabCities, icon: "📍" },
    { id: "route", label: nextRouteMessages.tabRoute, icon: "🧭" },
  ];

  return createPortal(
    <div className="save-destination-modal save-destination-modal--next-route" role="presentation">
      <button
        type="button"
        className="save-destination-modal__backdrop"
        aria-label={nextRouteMessages.close}
        onClick={onClose}
        disabled={saving}
      />

      <div
        className="save-destination-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="next-route-title"
      >
        <div className="save-destination-modal__header">
          <div>
            <h2 id="next-route-title" className="save-destination-modal__title">
              {nextRouteMessages.title}
            </h2>
            <p className="save-destination-modal__subtitle">{nextRouteMessages.subtitle}</p>
          </div>
          <button
            type="button"
            className="save-destination-modal__close"
            onClick={onClose}
            aria-label={nextRouteMessages.close}
            disabled={saving}
          >
            ✕
          </button>
        </div>

        <div className="save-destination-modal__search-wrap">
          <span className="save-destination-modal__search-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={nextRouteMessages.searchPlaceholder}
            className="save-destination-modal__search"
            autoComplete="off"
          />
        </div>

        {!isSearching ? (
          <div className="save-destination-modal__tabs" role="tablist">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`save-destination-modal__tab${tab === item.id ? " save-destination-modal__tab--active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        {showRouteTabAction ? (
          <button
            type="button"
            className="save-destination-modal__status save-destination-modal__status-action"
            onClick={goToMyRouteTab}
          >
            {statusLabel}
          </button>
        ) : (
          <div className="save-destination-modal__status">{statusLabel}</div>
        )}

        {showListSkeleton ? (
          <SaveDestinationModalListSkeleton rows={8} variant={listSkeletonVariant} />
        ) : (
        <ul className="save-destination-modal__list scrollbar-thin">
          {listEmptyMessage ? (
            <li className="save-destination-modal__empty">{listEmptyMessage}</li>
          ) : tab === "route" && !isSearching ? (
            stops.map((stop, index) => {
              const row = stopToRow(stop, index);
              const key = browseRowKey(row);
              const isBusy = busyId === key;
              return (
                <li key={stop.id} className="save-destination-modal__item">
                  <div className="save-destination-modal__row">
                    <span className="save-destination-modal__flag">
                      <Image
                        src={countryCodeToFlagUrl(row.countryCode)}
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                    </span>
                    <span className="save-destination-modal__text">
                      <span className="save-destination-modal__name" title={row.title}>
                        {row.title}
                      </span>
                      <span className="save-destination-modal__meta" title={row.subtitle}>
                        {row.subtitle}
                      </span>
                    </span>
                    <div className="save-destination-modal__row-actions">
                      <button
                        type="button"
                        className="save-destination-modal__mini-btn"
                        onClick={() => moveStop(row.index, -1)}
                        disabled={row.index === 0 || isBusy}
                        aria-label={nextRouteMessages.moveUp}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="save-destination-modal__mini-btn"
                        onClick={() => moveStop(row.index, 1)}
                        disabled={row.index === stops.length - 1 || isBusy}
                        aria-label={nextRouteMessages.moveDown}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="save-destination-modal__check save-destination-modal__check--on"
                        onClick={() => removeFromRoute(key)}
                        disabled={isBusy}
                        aria-label={nextRouteMessages.removeStop}
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                </li>
              );
            })
          ) : (
            listRows.map((row) => {
              const key = browseRowKey(row);
              const onRoute = stopKeys.has(key);
              const isBusy = busyId === key;
              return (
                <li key={key} className="save-destination-modal__item">
                  <div className="save-destination-modal__row">
                    <span className="save-destination-modal__flag">
                      <Image
                        src={countryCodeToFlagUrl(row.countryCode)}
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                    </span>
                    <span className="save-destination-modal__text">
                      <span className="save-destination-modal__name" title={row.title}>
                        {row.title}
                      </span>
                      <span className="save-destination-modal__meta" title={row.subtitle}>
                        {row.subtitle}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={`save-destination-modal__check${onRoute ? " save-destination-modal__check--on" : ""}`}
                      onClick={() =>
                        onRoute
                          ? removeFromRoute(key)
                          : addToRoute(browseRowToSearchResult(row))
                      }
                      disabled={isBusy}
                      aria-label={onRoute ? nextRouteMessages.removeStop : nextRouteMessages.addStop}
                    >
                      {onRoute ? "✓" : "+"}
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
        )}

        {!showListSkeleton ? (
          <div className="save-destination-modal__footer">
            <p
              className={`save-destination-modal__footer-hint${
                saveError ? " save-destination-modal__footer-hint--error" : ""
              }`}
            >
              {saveError ?? nextRouteMessages.saveHint}
            </p>
            <button
              type="button"
              className="save-destination-modal__save-btn"
              disabled={loadingRoute || !hasUnsavedChanges || saving}
              onClick={() => void handleSave()}
            >
              {saving ? commonMessages.loading : commonMessages.save}
            </button>
          </div>
        ) : (
          <div className="save-destination-modal__footer save-destination-modal__footer--skeleton">
            <p className="save-destination-modal__footer-hint">{nextRouteMessages.saveHint}</p>
            <button type="button" className="save-destination-modal__save-btn" disabled>
              {commonMessages.save}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
