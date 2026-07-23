"use client";

import Image from "next/image";
import { SaveDestinationModalListSkeleton } from "@/components/skeletons/SaveDestinationModalSkeleton";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import { getCountryName, searchCountries } from "@/lib/data/countries";
import { getPopularCountries } from "@/lib/data/popular-countries";
import { POPULAR_DESTINATIONS } from "@/lib/data/popular-destinations";
import { useAppMessages } from "@/lib/i18n/client-messages";
import { getLocalizedCityName } from "@/lib/i18n/place-names";
import type { Locale } from "@/lib/i18n/config";
import {
  readOwnNextRouteCache,
} from "@/lib/client/session-page-cache";
import { fetchNextRoute, persistNextRouteStops } from "@/lib/client/next-route-state";
import { useToast } from "@/components/ui/ToastProvider";
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

function popularCityToRow(
  destination: (typeof POPULAR_DESTINATIONS)[number],
  locale: Locale
): BrowseRow {
  return {
    id: rowId("city", destination.countryCode, destination.cityName),
    kind: "city",
    title: getLocalizedCityName(destination.countryCode, destination.cityName, locale),
    subtitle: getCountryName(destination.countryCode, locale),
    countryCode: destination.countryCode,
    countryName: getCountryName(destination.countryCode, locale),
    cityName: destination.cityName,
  };
}

function searchToRow(result: SearchResult, locale: Locale): BrowseRow {
  if (result.kind === "country") {
    return countryToRow({
      code: result.countryCode,
      name: getCountryName(result.countryCode, locale),
    });
  }
  const cityName = result.cityName!;
  return {
    id: rowId("city", result.countryCode, cityName),
    kind: "city",
    title: getLocalizedCityName(result.countryCode, cityName, locale),
    subtitle: getCountryName(result.countryCode, locale),
    countryCode: result.countryCode,
    countryName: getCountryName(result.countryCode, locale),
    cityName,
  };
}

function stopToRow(
  stop: NextRouteStop,
  index: number,
  locale: Locale
): BrowseRow & { index: number } {
  if (stop.kind === "country") {
    const code = stop.countryCode ?? "";
    const name = getCountryName(code || stop.name, locale) || stop.name;
    return { ...countryToRow({ code, name }), index };
  }
  const code = stop.countryCode ?? "";
  const cityName = stop.name;
  return {
    id: rowId("city", code, cityName),
    kind: "city",
    title: getLocalizedCityName(code, cityName, locale),
    subtitle: getCountryName(code, locale),
    countryCode: code,
    countryName: getCountryName(code, locale),
    cityName,
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
    return buildCountryStop(
      result.countryCode,
      getCountryName(result.countryCode)
    );
  }
  return buildCityStop(
    result.cityName!,
    result.countryCode,
    getCountryName(result.countryCode)
  );
}

export function NextRouteModal({ open, onClose, initialTab = "countries" }: NextRouteModalProps) {
  const { common: commonMessages, saveDestination: saveDestinationMessages, nextRoute: nextRouteMessages } = useAppMessages();
  const locale = useLocale() === "tr" ? "tr" : "en";
  const cachedRoute = readOwnNextRouteCache();
  const [stops, setStops] = useState<NextRouteStop[]>(() => cachedRoute?.stops ?? []);
  const [tab, setTab] = useState<NextRouteTab>("countries");
  const [query, setQuery] = useState("");
  const [loadingRoute, setLoadingRoute] = useState(() => cachedRoute === null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedStops, setSavedStops] = useState<NextRouteStop[]>(() => cachedRoute?.stops ?? []);
  const [saveError, setSaveError] = useState<string | null>(null);
  const toast = useToast();
  const hasRouteRef = useRef(cachedRoute !== null);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length >= 2;

  const stopKeys = useMemo(() => new Set(stops.map(stopKey)), [stops]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTab(initialTab);
    setSearchResults([]);
    setSaveError(null);

    const cached = readOwnNextRouteCache();
    if (cached !== null) {
      setStops(cached.stops);
      setSavedStops(cached.stops);
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
        setStops(result.route.stops);
        setSavedStops(result.route.stops);
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
      fetch(`/api/destinations/search?q=${encodeURIComponent(trimmedQuery)}&locale=${locale}`, {
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
          const localCountries = searchCountries(trimmedQuery, 8, locale).map((country) => ({
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
  }, [open, isSearching, trimmedQuery, locale]);

  const hasUnsavedChanges = useMemo(
    () => !areNextRouteStopsEqual(stops, savedStops),
    [savedStops, stops]
  );

  const applyStops = useCallback((updater: (prev: NextRouteStop[]) => NextRouteStop[]) => {
    setSaveError(null);
    setStops((prev) => updater(prev));
  }, []);

  const handleSave = useCallback(() => {
    if (!hasUnsavedChanges) return;

    const cached = readOwnNextRouteCache();
    const previousRoute = cached ?? { stops: savedStops };
    const pendingStops = stops;

    setSavedStops(pendingStops);
    setSaveError(null);
    onClose();

    persistNextRouteStops(pendingStops, {
      previousRoute: { ...previousRoute, stops: savedStops },
      onError: (message) => {
        toast.show(message || nextRouteMessages.saveFailed, 2500);
      },
    });
  }, [hasUnsavedChanges, nextRouteMessages.saveFailed, onClose, savedStops, stops, toast]);

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
      return getPopularCountries(40).map((country) =>
        countryToRow({
          ...country,
          name: getCountryName(country.code, locale),
        })
      );
    }
    if (tab === "cities") {
      return POPULAR_DESTINATIONS.filter((destination) => destination.kind === "city")
        .slice(0, 40)
        .map((destination) => popularCityToRow(destination, locale));
    }
    return [];
  }, [tab, locale]);

  const listRows = useMemo(() => {
    if (isSearching) return searchResults.map((result) => searchToRow(result, locale));
    if (tab === "route") return stops.map((stop, index) => stopToRow(stop, index, locale));
    return browseRows;
  }, [browseRows, isSearching, searchResults, stops, tab, locale]);

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
              const row = stopToRow(stop, index, locale);
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
              disabled={loadingRoute || !hasUnsavedChanges}
              onClick={handleSave}
            >
              {commonMessages.save}
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
