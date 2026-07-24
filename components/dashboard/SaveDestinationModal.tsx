"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import {
  POPULAR_DESTINATIONS,
  type PopularDestination,
} from "@/lib/data/popular-destinations";
import { POPULAR_PARKS, type PopularPark } from "@/lib/data/popular-parks";
import { getCountryList, getCountryName, searchCountries } from "@/lib/data/countries";
import { getPopularCountries } from "@/lib/data/popular-countries";
import { fetchModalBrowseCities } from "@/lib/client/modal-cities-browse";
import {
  quickAddDestination,
  quickRemoveDestination,
} from "@/lib/client/destination-actions";
import { quickAddPark, quickRemovePark } from "@/lib/client/park-destination-actions";
import { addCity } from "@/lib/client/city-actions";
import { addWishlistCountry, removeWishlistCountry } from "@/lib/client/country-actions";
import {
  PROFILE_DATA_STALE_EVENT,
  TRAVEL_STATE_UPDATED_EVENT,
  readTravelStateCache,
  type TravelStateData,
} from "@/lib/client/session-page-cache";
import { fetchTravelState } from "@/lib/client/travel-state";
import { addPark } from "@/lib/client/park-actions";
import { CityForm } from "@/components/dashboard/CityForm";
import { ParkForm } from "@/components/dashboard/ParkForm";
import {
  SaveDestinationModalListSkeleton,
  SaveDestinationModalStatusSkeleton,
} from "@/components/skeletons/SaveDestinationModalSkeleton";
import { useAppMessages } from "@/lib/i18n/client-messages";
import type { Locale } from "@/lib/i18n/config";
import { getLocalizedCityName } from "@/lib/i18n/place-names";
import { getLocalizedParkName } from "@/lib/i18n/park-place-names";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { parkTypeLabel } from "@/lib/utils/park-type";
import { useToast } from "@/components/ui/ToastProvider";
import type {
  ParkType,
  VisitedCity,
  VisitedCountry,
  VisitedPark,
  WishlistCountry,
} from "@/types/database";
import { PARK_TYPES } from "@/types/database";
import { resolveCountryHubSlug } from "@/lib/data/country-hubs";
import { countryPath } from "@/lib/seo/site";
import { cityPlacePath, parkPlacePath } from "@/lib/utils/hub-place-path";

const WORLD_COUNTRY_TOTAL = 195;
const SEARCH_DEBOUNCE_MS = 280;

type SaveDestinationTab = "popular" | "countries" | "cities" | "parks" | "want";

type SearchCityResult = {
  cityName: string;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
};

type SearchParkResult = {
  parkName: string;
  parkType: ParkType;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
};

type DestinationRow =
  | {
      id: string;
      kind: "city";
      title: string;
      subtitle: string;
      countryCode: string;
      countryName: string;
      cityName: string;
      latitude: number;
      longitude: number;
    }
  | {
      id: string;
      kind: "country";
      title: string;
      subtitle: string;
      countryCode: string;
      countryName: string;
    }
  | {
      id: string;
      kind: "park";
      title: string;
      subtitle: string;
      countryCode: string;
      countryName: string;
      parkName: string;
      parkType: ParkType;
      latitude?: number;
      longitude?: number;
    };

export type SaveDestinationInitialTab = "popular" | "countries" | "cities" | "parks" | "want";

type SaveDestinationModalProps = {
  open: boolean;
  initialTab?: SaveDestinationInitialTab;
  onClose: () => void;
};

function destinationId(
  kind: "city" | "country" | "park",
  countryCode: string,
  name = "",
  parkType?: ParkType
): string {
  if (kind === "country") {
    return `country:${countryCode}`.toLowerCase();
  }
  if (kind === "park") {
    return `park:${countryCode}:${parkType}:${name}`.toLowerCase();
  }
  return `${countryCode}:${name}`.toLowerCase();
}

function countryRowId(countryCode: string): string {
  return destinationId("country", countryCode);
}

function markLinkedCountry(ids: Set<string>, countryCode: string) {
  ids.add(countryRowId(countryCode));
}

function unmarkLinkedCountry(ids: Set<string>, countryCode: string) {
  ids.delete(countryRowId(countryCode));
}

function destinationRowHref(row: DestinationRow): string | null {
  if (row.kind === "country") {
    const slug = resolveCountryHubSlug(row.countryCode, row.countryName);
    return slug ? countryPath(slug) : null;
  }
  if (row.kind === "city") {
    return cityPlacePath(row.countryCode, row.cityName);
  }
  return parkPlacePath(row.parkName, row.countryCode);
}

function modalBrowseCityToRow(
  city: { countryCode: string; name: string },
  locale: Locale
): DestinationRow {
  return {
    id: destinationId("city", city.countryCode, city.name),
    kind: "city",
    title: getLocalizedCityName(city.countryCode, city.name, locale),
    subtitle: getCountryName(city.countryCode, locale),
    countryCode: city.countryCode,
    countryName: getCountryName(city.countryCode, locale),
    cityName: city.name,
    latitude: 0,
    longitude: 0,
  };
}

function popularToRow(destination: PopularDestination, locale: Locale): DestinationRow {
  if (destination.kind === "country") {
    const countryName = getCountryName(destination.countryCode, locale);
    return {
      id: destinationId("country", destination.countryCode),
      kind: "country",
      title: countryName,
      subtitle: countryName,
      countryCode: destination.countryCode,
      countryName,
    };
  }

  return {
    id: destinationId("city", destination.countryCode, destination.cityName),
    kind: "city",
    title: getLocalizedCityName(destination.countryCode, destination.cityName, locale),
    subtitle: getCountryName(destination.countryCode, locale),
    countryCode: destination.countryCode,
    countryName: getCountryName(destination.countryCode, locale),
    cityName: destination.cityName,
    latitude: destination.latitude,
    longitude: destination.longitude,
  };
}

function countryToRow(country: { code: string; name: string }): DestinationRow {
  return {
    id: destinationId("country", country.code),
    kind: "country",
    title: country.name,
    subtitle: country.code,
    countryCode: country.code,
    countryName: country.name,
  };
}

function cityToRow(city: SearchCityResult, locale: Locale): DestinationRow {
  return {
    id: destinationId("city", city.countryCode, city.cityName),
    kind: "city",
    title: getLocalizedCityName(city.countryCode, city.cityName, locale),
    subtitle: getCountryName(city.countryCode, locale),
    countryCode: city.countryCode,
    countryName: getCountryName(city.countryCode, locale),
    cityName: city.cityName,
    latitude: city.latitude,
    longitude: city.longitude,
  };
}

function visitedCityToRow(city: VisitedCity, locale: Locale): DestinationRow {
  return {
    id: destinationId("city", city.country_code, city.city_name),
    kind: "city",
    title: getLocalizedCityName(city.country_code, city.city_name, locale),
    subtitle: getCountryName(city.country_code, locale),
    countryCode: city.country_code,
    countryName: getCountryName(city.country_code, locale),
    cityName: city.city_name,
    latitude: city.latitude ?? 0,
    longitude: city.longitude ?? 0,
  };
}

function visitedParkToRow(park: VisitedPark, locale: Locale): DestinationRow {
  return {
    id: destinationId("park", park.country_code, park.park_name, park.park_type as ParkType),
    kind: "park",
    title: getLocalizedParkName(park.country_code, park.park_name, locale),
    subtitle: `${getCountryName(park.country_code, locale)} · ${parkTypeLabel(park.park_type)}`,
    countryCode: park.country_code,
    countryName: getCountryName(park.country_code, locale),
    parkName: park.park_name,
    parkType: park.park_type as ParkType,
    ...(park.latitude != null && park.longitude != null
      ? { latitude: park.latitude, longitude: park.longitude }
      : {}),
  };
}

function parkToRow(park: SearchParkResult | PopularPark, locale: Locale): DestinationRow {
  const hasCoords =
    "latitude" in park &&
    "longitude" in park &&
    typeof park.latitude === "number" &&
    typeof park.longitude === "number";
  const countryName = getCountryName(park.countryCode, locale);

  return {
    id: destinationId("park", park.countryCode, park.parkName, park.parkType),
    kind: "park",
    title: getLocalizedParkName(park.countryCode, park.parkName, locale),
    subtitle: `${countryName} · ${parkTypeLabel(park.parkType)}`,
    countryCode: park.countryCode,
    countryName,
    parkName: park.parkName,
    parkType: park.parkType,
    ...(hasCoords ? { latitude: park.latitude, longitude: park.longitude } : {}),
  };
}

function rowPayload(row: DestinationRow) {
  if (row.kind === "country") {
    return {
      kind: "country" as const,
      city_name: row.countryName,
      country_code: row.countryCode,
      country_name: row.countryName,
      latitude: 0,
      longitude: 0,
    };
  }

  if (row.kind === "city") {
    return {
      kind: "city" as const,
      city_name: row.cityName,
      country_code: row.countryCode,
      country_name: row.countryName,
      latitude: row.latitude,
      longitude: row.longitude,
    };
  }

  throw new Error("rowPayload is only for city and country rows");
}

function findVisitedCityForRow(
  row: Extract<DestinationRow, { kind: "city" }>,
  cities: VisitedCity[]
): VisitedCity | undefined {
  const countryCode = row.countryCode.toUpperCase();
  const cityName = row.cityName.toLowerCase();

  return cities.find(
    (city) =>
      city.country_code.toUpperCase() === countryCode &&
      city.city_name.toLowerCase() === cityName
  );
}

function findVisitedParkForRow(
  row: Extract<DestinationRow, { kind: "park" }>,
  parks: VisitedPark[]
): VisitedPark | undefined {
  const countryCode = row.countryCode.toUpperCase();
  const parkName = row.parkName.toLowerCase();

  return parks.find(
    (park) =>
      park.country_code.toUpperCase() === countryCode &&
      park.park_type === row.parkType &&
      park.park_name.toLowerCase() === parkName
  );
}

function queryMatchesCityName(
  query: string,
  rows: DestinationRow[],
  cities: SearchCityResult[],
  visitedCities: VisitedCity[]
): boolean {
  const normalized = query.toLowerCase();
  if (
    cities.some((city) => city.cityName.toLowerCase() === normalized) ||
    rows.some((row) => row.kind === "city" && row.cityName.toLowerCase() === normalized) ||
    visitedCities.some((city) => city.city_name.toLowerCase() === normalized)
  ) {
    return true;
  }
  return POPULAR_DESTINATIONS.some(
    (destination) =>
      destination.kind === "city" && destination.cityName.toLowerCase() === normalized
  );
}

function queryMatchesParkName(
  query: string,
  rows: DestinationRow[],
  parks: SearchParkResult[],
  visitedParks: VisitedPark[]
): boolean {
  const normalized = query.toLowerCase();
  if (
    parks.some((park) => park.parkName.toLowerCase() === normalized) ||
    rows.some((row) => row.kind === "park" && row.parkName.toLowerCase() === normalized) ||
    visitedParks.some((park) => park.park_name.toLowerCase() === normalized)
  ) {
    return true;
  }
  return POPULAR_PARKS.some((park) => park.parkName.toLowerCase() === normalized);
}

function excludeVisitedCountries(
  rows: DestinationRow[],
  visitedCountryCodes: Set<string>
): DestinationRow[] {
  return rows.filter(
    (row) =>
      row.kind !== "country" || !visitedCountryCodes.has(row.countryCode.toUpperCase())
  );
}

export function SaveDestinationModal({
  open,
  initialTab = "popular",
  onClose,
}: SaveDestinationModalProps) {
  const { common: commonMessages, countryHub: countryHubMessages, city: cityMessages, destinations: destinationMessages, park: parkMessages, saveDestination: saveDestinationMessages } = useAppMessages();
  const locale = useLocale() === "tr" ? "tr" : "en";
  const countryList = useMemo(() => getCountryList(locale), [locale]);
  const toast = useToast();

  const [tab, setTab] = useState<SaveDestinationTab>("popular");
  const [query, setQuery] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingTravelState, setLoadingTravelState] = useState(
    () => !readTravelStateCache()
  );
  const [visitedCountries, setVisitedCountries] = useState<VisitedCountry[]>(
    () => readTravelStateCache()?.visitedCountries ?? []
  );
  const [visitedCities, setVisitedCities] = useState<VisitedCity[]>(
    () => readTravelStateCache()?.visitedCities ?? []
  );
  const [visitedParks, setVisitedParks] = useState<VisitedPark[]>(
    () => readTravelStateCache()?.visitedParks ?? []
  );
  const [visitedCodes, setVisitedCodes] = useState<string[]>(
    () => (readTravelStateCache()?.visitedCodes ?? []).map((code) => code.toUpperCase())
  );
  const [wishlistCountries, setWishlistCountries] = useState<WishlistCountry[]>(
    () => readTravelStateCache()?.wishlistCountries ?? []
  );
  const [searchCities, setSearchCities] = useState<SearchCityResult[]>([]);
  const [searchParks, setSearchParks] = useState<SearchParkResult[]>([]);
  const [browseCities, setBrowseCities] = useState<{ countryCode: string; name: string }[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [recentlyRemoved, setRecentlyRemoved] = useState<Set<string>>(new Set());
  const [recentlyWishlistAdded, setRecentlyWishlistAdded] = useState<Set<string>>(new Set());
  const [recentlyWishlistRemoved, setRecentlyWishlistRemoved] = useState<Set<string>>(new Set());
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [editingParkId, setEditingParkId] = useState<string | null>(null);
  const hasTravelStateRef = useRef(Boolean(readTravelStateCache()));

  const applyTravelData = useCallback((data: TravelStateData) => {
    setVisitedCountries(data.visitedCountries ?? []);
    setVisitedCities(data.visitedCities ?? []);
    setVisitedParks(data.visitedParks ?? []);
    setVisitedCodes((data.visitedCodes ?? []).map((code) => code.toUpperCase()));
    setWishlistCountries(data.wishlistCountries ?? []);
    hasTravelStateRef.current = true;
  }, []);

  const loadTravelState = useCallback(async (options?: { background?: boolean; force?: boolean }) => {
    const background = options?.background ?? hasTravelStateRef.current;
    if (!background) {
      setLoadingTravelState(true);
    }
    try {
      const result = await fetchTravelState({
        preferCache: !options?.force,
        force: options?.force,
      });
      if (result.ok) {
        applyTravelData(result.data);
      }
    } catch {
      // keep previous state
    } finally {
      if (!background) {
        setLoadingTravelState(false);
      }
    }
  }, [applyTravelData]);

  useEffect(() => {
    if (!open) {
      hasTravelStateRef.current = Boolean(readTravelStateCache());
      return;
    }
    setQuery("");
    setTab(initialTab);
    setSearchCities([]);
    setSearchParks([]);
    setRecentlyAdded(new Set());
    setRecentlyRemoved(new Set());
    setRecentlyWishlistAdded(new Set());
    setRecentlyWishlistRemoved(new Set());
    setPendingIds(new Set());
    setEditingCityId(null);
    setEditingParkId(null);

    const cached = readTravelStateCache();
    if (cached) {
      applyTravelData(cached);
      setLoadingTravelState(false);
      return;
    }

    void loadTravelState({ background: false });
  }, [open, initialTab, loadTravelState, applyTravelData]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchModalBrowseCities(40).then((cities) => {
      if (!cancelled) setBrowseCities(cities);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onProfileStale() {
      void loadTravelState({ background: true, force: true });
    }

    function onTravelStateUpdated(event: Event) {
      const detail = (event as CustomEvent<{ data: TravelStateData }>).detail;
      if (!detail?.data) return;
      applyTravelData(detail.data);
      setLoadingTravelState(false);
    }

    window.addEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
    window.addEventListener(TRAVEL_STATE_UPDATED_EVENT, onTravelStateUpdated);
    return () => {
      window.removeEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
      window.removeEventListener(TRAVEL_STATE_UPDATED_EVENT, onTravelStateUpdated);
    };
  }, [open, loadTravelState, applyTravelData]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const trimmedQuery = query.trim();
  const needle = trimmedQuery.toLowerCase();

  useEffect(() => {
    if (!open || trimmedQuery.length < 2) {
      setSearchCities([]);
      setSearchParks([]);
      setLoadingSearch(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await fetch(
          `/api/destinations/search?q=${encodeURIComponent(trimmedQuery)}&locale=${locale}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setSearchCities([]);
          setSearchParks([]);
          return;
        }
        const data = await res.json();
        setSearchCities(data.cities ?? []);
        setSearchParks(data.parks ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchCities([]);
        setSearchParks([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSearch(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, trimmedQuery, locale]);

  const isWantMode = tab === "want";

  const wishlistByCode = useMemo(() => {
    const map = new Map<string, WishlistCountry>();
    for (const country of wishlistCountries) {
      map.set(country.country_code.toUpperCase(), country);
    }
    return map;
  }, [wishlistCountries]);

  const visitedCountryCodes = useMemo(() => {
    return new Set(visitedCodes);
  }, [visitedCodes]);

  const wantedIds = useMemo(() => {
    const ids = new Set<string>();

    for (const country of wishlistCountries) {
      ids.add(countryRowId(country.country_code));
    }

    for (const code of recentlyWishlistAdded) {
      ids.add(countryRowId(code));
    }

    for (const code of recentlyWishlistRemoved) {
      ids.delete(countryRowId(code));
    }

    return ids;
  }, [wishlistCountries, recentlyWishlistAdded, recentlyWishlistRemoved]);

  const addedIds = useMemo(() => {
    const ids = new Set<string>();

    for (const code of visitedCountryCodes) {
      markLinkedCountry(ids, code);
    }

    for (const city of visitedCities) {
      ids.add(destinationId("city", city.country_code, city.city_name));
    }

    for (const park of visitedParks) {
      ids.add(
        destinationId("park", park.country_code, park.park_name, park.park_type as ParkType)
      );
    }

    for (const id of recentlyAdded) ids.add(id);
    for (const id of recentlyRemoved) ids.delete(id);

    return ids;
  }, [visitedCountryCodes, visitedCities, visitedParks, recentlyAdded, recentlyRemoved]);

  const visitedCountryCount = visitedCountryCodes.size;

  const rows = useMemo((): DestinationRow[] => {
    if (trimmedQuery.length >= 2) {
      const visitedCityRows = visitedCities
        .filter((city) => city.city_name.toLowerCase().includes(needle))
        .map((city) => visitedCityToRow(city, locale));
      const visitedParkRows = visitedParks
        .filter((park) => park.park_name.toLowerCase().includes(needle))
        .map((park) => visitedParkToRow(park, locale));
      const countryRows = searchCountries(trimmedQuery, 8, locale).map(countryToRow);
      const cityRows = searchCities.map((city) => cityToRow(city, locale));
      const parkRows = searchParks.map((park) => parkToRow(park, locale));
      const popularRows = POPULAR_DESTINATIONS.filter((destination) =>
        `${destination.label} ${destination.cityName} ${destination.countryName} ${destination.countryCode}`
          .toLowerCase()
          .includes(needle)
      ).map((destination) => popularToRow(destination, locale));

      const popularParkRows = POPULAR_PARKS.filter((park) =>
        `${park.label} ${park.parkName} ${park.countryName} ${park.countryCode}`
          .toLowerCase()
          .includes(needle)
      ).map((park) => parkToRow(park, locale));

      const merged = new Map<string, DestinationRow>();
      for (const row of [
        ...visitedCityRows,
        ...visitedParkRows,
        ...countryRows,
        ...popularRows,
        ...popularParkRows,
        ...cityRows,
        ...parkRows,
      ]) {
        merged.set(row.id, row);
      }
      let results = [...merged.values()];
      if (isWantMode) {
        results = excludeVisitedCountries(
          results.filter((row) => row.kind === "country"),
          visitedCountryCodes
        );
      }
      return results;
    }

    if (tab === "want") {
      return excludeVisitedCountries(
        getPopularCountries(40).map((country) =>
          countryToRow({
            ...country,
            name: getCountryName(country.code, locale),
          })
        ),
        visitedCountryCodes
      );
    }

    if (tab === "countries") {
      return getPopularCountries(40).map((country) =>
        countryToRow({
          ...country,
          name: getCountryName(country.code, locale),
        })
      );
    }

    if (tab === "cities") {
      return browseCities.map((city) => modalBrowseCityToRow(city, locale));
    }

    if (tab === "parks") {
      return POPULAR_PARKS.slice(0, 40).map((park) => parkToRow(park, locale));
    }

    return POPULAR_DESTINATIONS.slice(0, 40).map((destination) =>
      popularToRow(destination, locale)
    );
  }, [isWantMode, needle, searchCities, searchParks, tab, trimmedQuery.length, visitedCountryCodes, visitedCities, visitedParks, locale, browseCities]);

  const editingCity = useMemo(
    () => visitedCities.find((city) => city.id === editingCityId) ?? null,
    [editingCityId, visitedCities]
  );

  const editingPark = useMemo(
    () => visitedParks.find((park) => park.id === editingParkId) ?? null,
    [editingParkId, visitedParks]
  );

  const formattedQueryName = formatCityDisplayName(trimmedQuery);

  const { customCountryOptions, customCountryDefault } = useMemo(() => {
    type Entry = { value: string; label: string; priority: number };
    const map = new Map<string, Entry>();

    const add = (code: string, name: string, priority: number) => {
      const value = code.toUpperCase();
      const existing = map.get(value);
      if (!existing || priority < existing.priority) {
        map.set(value, { value, label: name, priority });
      }
    };

    for (const city of searchCities) {
      add(city.countryCode, city.countryName, 0);
    }
    for (const park of searchParks) {
      add(park.countryCode, park.countryName, 0);
    }
    for (const row of rows) {
      if (row.kind === "country") {
        add(row.countryCode, row.countryName, 1);
      }
    }
    for (const country of searchCountries(trimmedQuery, 12, locale)) {
      add(country.code, country.name, 1);
    }
    for (const country of visitedCountries) {
      add(country.country_code, country.country_name, 2);
    }
    for (const country of countryList) {
      add(country.code, country.name, 3);
    }

    const sorted = [...map.values()].sort(
      (a, b) =>
        a.priority - b.priority ||
        a.label.localeCompare(b.label, locale === "tr" ? "tr" : "en", {
          sensitivity: "base",
        })
    );

    return {
      customCountryOptions: sorted.map(({ value, label }) => ({ value, label })),
      customCountryDefault: sorted[0]?.value ?? countryList[0]!.code,
    };
  }, [rows, searchCities, searchParks, trimmedQuery, visitedCountries, locale, countryList]);

  const showCustomCity =
    !isWantMode &&
    trimmedQuery.length >= 2 &&
    !loadingSearch &&
    !queryMatchesCityName(trimmedQuery, rows, searchCities, visitedCities);

  const showCustomPark =
    !isWantMode &&
    trimmedQuery.length >= 2 &&
    !loadingSearch &&
    !queryMatchesParkName(trimmedQuery, rows, searchParks, visitedParks);

  const isCityAlreadyOnMap = useCallback(
    (cityName: string, countryCode: string) =>
      addedIds.has(destinationId("city", countryCode, cityName)),
    [addedIds]
  );

  const isParkAlreadyOnMap = useCallback(
    (parkName: string, countryCode: string, parkType: ParkType) =>
      addedIds.has(destinationId("park", countryCode, parkName, parkType)),
    [addedIds]
  );

  const markPending = useCallback((id: string) => {
    setPendingIds((prev) => new Set(prev).add(id));
  }, []);

  const clearPending = useCallback((id: string) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const applyOptimisticAdd = useCallback((row: DestinationRow, id: string) => {
    setRecentlyRemoved((prev) => {
      const next = new Set(prev);
      next.delete(id);
      if (row.kind === "city" || row.kind === "park") {
        unmarkLinkedCountry(next, row.countryCode);
      }
      return next;
    });
    setRecentlyAdded((prev) => {
      const next = new Set(prev).add(id);
      if (row.kind === "city" || row.kind === "park") {
        markLinkedCountry(next, row.countryCode);
      }
      return next;
    });
  }, []);

  const applyOptimisticRemove = useCallback((row: DestinationRow, id: string) => {
    setRecentlyAdded((prev) => {
      const next = new Set(prev);
      next.delete(id);
      if (row.kind === "country") {
        unmarkLinkedCountry(next, row.countryCode);
      }
      return next;
    });
    setRecentlyRemoved((prev) => new Set(prev).add(id));
  }, []);

  const revertOptimisticAdd = useCallback((row: DestinationRow, id: string) => {
    setRecentlyAdded((prev) => {
      const next = new Set(prev);
      next.delete(id);
      if (row.kind === "city" || row.kind === "park") {
        unmarkLinkedCountry(next, row.countryCode);
      }
      return next;
    });
    setRecentlyRemoved((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const revertOptimisticRemove = useCallback((row: DestinationRow, id: string) => {
    setRecentlyRemoved((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setRecentlyAdded((prev) => {
      const next = new Set(prev).add(id);
      if (row.kind === "country") {
        markLinkedCountry(next, row.countryCode);
      }
      return next;
    });
  }, []);

  const syncRemoveCountryLink = useCallback((row: DestinationRow, id: string, countryRemoved: boolean) => {
    if (!countryRemoved || (row.kind !== "city" && row.kind !== "park")) return;

    setRecentlyAdded((prev) => {
      const next = new Set(prev);
      unmarkLinkedCountry(next, row.countryCode);
      return next;
    });
    setRecentlyRemoved((prev) => {
      const next = new Set(prev);
      markLinkedCountry(next, row.countryCode);
      return next;
    });
  }, []);

  async function ensureCountryOnMap(countryCode: string, countryName: string): Promise<boolean> {
    const code = countryCode.toUpperCase();
    if (addedIds.has(countryRowId(code))) return true;

    setRecentlyRemoved((prev) => {
      const next = new Set(prev);
      unmarkLinkedCountry(next, code);
      return next;
    });
    setRecentlyAdded((prev) => {
      const next = new Set(prev);
      markLinkedCountry(next, code);
      return next;
    });

    const result = await quickAddDestination({
      kind: "country",
      city_name: countryName,
      country_code: code,
      country_name: countryName,
      latitude: 0,
      longitude: 0,
    });

    if (!result.ok) {
      setRecentlyAdded((prev) => {
        const next = new Set(prev);
        unmarkLinkedCountry(next, code);
        return next;
      });
      setRecentlyRemoved((prev) => {
        const next = new Set(prev);
        unmarkLinkedCountry(next, code);
        return next;
      });
      toast.show(result.error, 2500);
      return false;
    }

    return true;
  }

  function submitCustomCity(countryCode: string, countryName: string) {
    const cityName = trimmedQuery;
    const id = destinationId("city", countryCode, cityName);
    if (isCityAlreadyOnMap(cityName, countryCode)) {
      toast.show(cityMessages.alreadyOnMap, 2000);
      return;
    }
    if (pendingIds.has("custom:city")) return;

    const row = cityToRow(
      {
        cityName,
        countryCode,
        countryName,
        latitude: 0,
        longitude: 0,
      },
      locale
    );

    markPending("custom:city");
    applyOptimisticAdd(row, id);
    toast.show(cityMessages.cityAdded, 1500);

    void (async () => {
      try {
        const ready = await ensureCountryOnMap(countryCode, countryName);
        if (!ready) {
          revertOptimisticAdd(row, id);
          return;
        }

        const result = await addCity({
          city_name: cityName,
          country_code: countryCode,
          country_name: countryName,
        });

        if (!result.ok) {
          revertOptimisticAdd(row, id);
          toast.show(result.error, 2500);
          return;
        }

        void loadTravelState({ background: true });
      } finally {
        clearPending("custom:city");
      }
    })();
  }

  function submitCustomPark(
    countryCode: string,
    countryName: string,
    parkType: ParkType
  ) {
    const parkName = trimmedQuery;
    const id = destinationId("park", countryCode, parkName, parkType);
    if (isParkAlreadyOnMap(parkName, countryCode, parkType)) {
      toast.show(parkMessages.alreadyOnMap, 2000);
      return;
    }
    if (pendingIds.has("custom:park")) return;

    const row = parkToRow(
      {
        parkName,
        parkType,
        countryCode,
        countryName,
        latitude: 0,
        longitude: 0,
      },
      locale
    );

    markPending("custom:park");
    applyOptimisticAdd(row, id);
    toast.show(parkMessages.parkAdded, 1500);

    void (async () => {
      try {
        const ready = await ensureCountryOnMap(countryCode, countryName);
        if (!ready) {
          revertOptimisticAdd(row, id);
          return;
        }

        const result = await addPark({
          park_name: parkName,
          park_type: parkType,
          country_code: countryCode,
          country_name: countryName,
        });

        if (!result.ok) {
          revertOptimisticAdd(row, id);
          toast.show(result.error, 2500);
          return;
        }

        void loadTravelState({ background: true });
      } finally {
        clearPending("custom:park");
      }
    })();
  }

  function promptCustomCity() {
    toast.showAction({
      message: saveDestinationMessages.customCityPrompt.replace("{name}", formattedQueryName),
      actionLabel: cityMessages.customCityAdd,
      fields: [
        {
          type: "select",
          id: "country",
          label: cityMessages.country,
          options: customCountryOptions,
          defaultValue: customCountryDefault,
        },
      ],
      onAction: (fieldValues) => {
        const code = fieldValues?.country;
        const option = customCountryOptions.find((entry) => entry.value === code);
        if (option) void submitCustomCity(option.value, option.label);
      },
    });
  }

  function promptCustomPark() {
    toast.showAction({
      message: saveDestinationMessages.customParkPrompt.replace("{name}", formattedQueryName),
      actionLabel: parkMessages.customParkAdd,
      fields: [
        {
          type: "select",
          id: "country",
          label: parkMessages.country,
          options: customCountryOptions,
          defaultValue: customCountryDefault,
        },
        {
          type: "select",
          id: "parkType",
          label: parkMessages.parkType,
          options: PARK_TYPES.map((type) => ({
            value: type,
            label: parkTypeLabel(type),
          })),
          defaultValue: "national_park",
        },
      ],
      onAction: (fieldValues) => {
        const code = fieldValues?.country;
        const option = customCountryOptions.find((entry) => entry.value === code);
        const parkType = (fieldValues?.parkType ?? "national_park") as ParkType;
        if (option) void submitCustomPark(option.value, option.label, parkType);
      },
    });
  }

  function handleWishlistToggle(row: DestinationRow) {
    if (row.kind !== "country") return;

    const code = row.countryCode.toUpperCase();
    if (visitedCountryCodes.has(code)) return;

    const id = row.id;
    if (pendingIds.has(id)) return;

    const wanted = wantedIds.has(id);
    markPending(id);

    if (wanted) {
      setRecentlyWishlistAdded((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
      setRecentlyWishlistRemoved((prev) => new Set(prev).add(code));
      toast.show(countryHubMessages.wishlistRemoved, 1500);
    } else {
      setRecentlyWishlistRemoved((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
      setRecentlyWishlistAdded((prev) => new Set(prev).add(code));
      toast.show(countryHubMessages.wishlistAdded, 1500);
    }

    void (async () => {
      try {
        if (wanted) {
          const wishlist = wishlistByCode.get(code);
          if (!wishlist) {
            setRecentlyWishlistRemoved((prev) => {
              const next = new Set(prev);
              next.delete(code);
              return next;
            });
            setRecentlyWishlistAdded((prev) => new Set(prev).add(code));
            return;
          }

          const result = await removeWishlistCountry(wishlist.id);
          if (!result.ok) {
            setRecentlyWishlistRemoved((prev) => {
              const next = new Set(prev);
              next.delete(code);
              return next;
            });
            setRecentlyWishlistAdded((prev) => new Set(prev).add(code));
            toast.show(result.error, 2500);
            return;
          }
        } else {
          const result = await addWishlistCountry(code);
          if (!result.ok) {
            setRecentlyWishlistAdded((prev) => {
              const next = new Set(prev);
              next.delete(code);
              return next;
            });
            setRecentlyWishlistRemoved((prev) => new Set(prev).add(code));
            toast.show(result.error, 2500);
            return;
          }
        }

        void loadTravelState({ background: true });
      } finally {
        clearPending(id);
      }
    })();
  }

  function handleToggle(row: DestinationRow) {
    if (isWantMode) {
      handleWishlistToggle(row);
      return;
    }

    const id = row.id;
    if (pendingIds.has(id)) return;

    const added = addedIds.has(id);
    markPending(id);

    if (added) {
      applyOptimisticRemove(row, id);
      if (row.kind === "park") {
        toast.show(parkMessages.removedToast, 1000);
      } else {
        toast.show(destinationMessages.removedToast, 1000);
      }
    } else {
      applyOptimisticAdd(row, id);
      if (row.kind === "park") {
        toast.show(parkMessages.addedToast, 1000);
      } else {
        toast.show(destinationMessages.addedToast, 1000);
      }
    }

    void (async () => {
      try {
        if (row.kind === "park") {
          const parkPayload = {
            park_name: row.parkName,
            park_type: row.parkType,
            country_code: row.countryCode,
            country_name: row.countryName,
            ...(row.latitude != null && row.longitude != null
              ? { latitude: row.latitude, longitude: row.longitude }
              : {}),
          };

          if (added) {
            const result = await quickRemovePark(parkPayload);
            if (!result.ok) {
              revertOptimisticRemove(row, id);
              toast.show(result.error, 2500);
              return;
            }
            if (!result.removed) {
              revertOptimisticRemove(row, id);
              return;
            }
            syncRemoveCountryLink(row, id, result.countryRemoved);
          } else {
            const result = await quickAddPark(parkPayload);
            if (!result.ok) {
              revertOptimisticAdd(row, id);
              toast.show(result.error, 2500);
              return;
            }
          }
        } else if (added) {
          const result = await quickRemoveDestination(rowPayload(row));
          if (!result.ok) {
            revertOptimisticRemove(row, id);
            toast.show(result.error, 2500);
            return;
          }
          if (!result.removed) {
            revertOptimisticRemove(row, id);
            return;
          }
          if (row.kind === "city" && result.countryRemoved) {
            syncRemoveCountryLink(row, id, true);
          }
        } else {
          const result = await quickAddDestination(rowPayload(row));
          if (!result.ok) {
            revertOptimisticAdd(row, id);
            toast.show(result.error, 2500);
            return;
          }
        }

        void loadTravelState({ background: true });
      } finally {
        clearPending(id);
      }
    })();
  }

  if (!open) return null;

  const tabs: { id: SaveDestinationTab; label: string; icon: string }[] = [
    { id: "popular", label: saveDestinationMessages.tabPopular, icon: "🧳" },
    { id: "countries", label: saveDestinationMessages.tabCountries, icon: "🌍" },
    { id: "cities", label: saveDestinationMessages.tabCities, icon: "📍" },
    { id: "parks", label: saveDestinationMessages.tabParks, icon: "🏞️" },
    { id: "want", label: saveDestinationMessages.tabWant, icon: "⭐" },
  ];

  const showListSkeleton =
    !editingCity &&
    !editingPark &&
    loadingTravelState &&
    !hasTravelStateRef.current;

  return (
    <div className="save-destination-modal" role="presentation">
      <button
        type="button"
        className="save-destination-modal__backdrop"
        aria-label={saveDestinationMessages.close}
        onClick={onClose}
      />

      <div
        className="save-destination-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-destination-title"
      >
        <div className="save-destination-modal__header">
          <div>
            <h2 id="save-destination-title" className="save-destination-modal__title">
              {saveDestinationMessages.title}
            </h2>
            <p className="save-destination-modal__subtitle">{saveDestinationMessages.subtitle}</p>
          </div>
          <button
            type="button"
            className="save-destination-modal__close"
            onClick={onClose}
            aria-label={saveDestinationMessages.close}
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
            placeholder={saveDestinationMessages.searchPlaceholder}
            className="save-destination-modal__search"
            autoComplete="off"
          />
        </div>

        {trimmedQuery.length < 2 ? (
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
                <span className="save-destination-modal__tab-label">{item.label}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="save-destination-modal__status">
          {loadingTravelState && !hasTravelStateRef.current ? (
            <SaveDestinationModalStatusSkeleton />
          ) : (
            saveDestinationMessages.visitedCount
              .replace("{visited}", String(visitedCountryCount))
              .replace("{total}", String(WORLD_COUNTRY_TOTAL))
          )}
        </div>

        {editingCity || editingPark ? (
          <div className="save-destination-modal__edit-panel scrollbar-thin">
            <button
              type="button"
              className="save-destination-modal__back"
              onClick={() => {
                setEditingCityId(null);
                setEditingParkId(null);
              }}
            >
              {saveDestinationMessages.backToSearch}
            </button>
            {editingCity ? (
              <CityForm
                city={editingCity}
                visitedCountries={visitedCountries}
                onSuccess={() => {
                  setEditingCityId(null);
                  void loadTravelState({ background: true });
                }}
                onCancel={() => setEditingCityId(null)}
              />
            ) : editingPark ? (
              <ParkForm
                park={editingPark}
                visitedCountries={visitedCountries}
                existingParks={visitedParks}
                onSuccess={() => {
                  setEditingParkId(null);
                  void loadTravelState({ background: true });
                }}
                onCancel={() => setEditingParkId(null)}
              />
            ) : null}
          </div>
        ) : showListSkeleton ? (
          <SaveDestinationModalListSkeleton />
        ) : (
        <ul className="save-destination-modal__list scrollbar-thin">
            <>
              {rows.map((row) => {
              const marked = isWantMode ? wantedIds.has(row.id) : addedIds.has(row.id);
              const visitedCity =
                !isWantMode && row.kind === "city" && marked
                  ? findVisitedCityForRow(row, visitedCities)
                  : undefined;
              const visitedPark =
                !isWantMode && row.kind === "park" && marked
                  ? findVisitedParkForRow(row, visitedParks)
                  : undefined;
              const pageHref = destinationRowHref(row);

              return (
                <li key={row.id} className="save-destination-modal__item">
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
                      {pageHref ? (
                        <Link
                          href={pageHref}
                          className="save-destination-modal__name save-destination-modal__name-link"
                          onClick={onClose}
                          title={row.title}
                          prefetch={false}
                        >
                          {row.title}
                        </Link>
                      ) : (
                        <span className="save-destination-modal__name" title={row.title}>
                          {row.title}
                        </span>
                      )}
                      <span className="save-destination-modal__meta" title={row.subtitle}>
                        {row.subtitle}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={`save-destination-modal__check${marked ? " save-destination-modal__check--on" : ""}`}
                      aria-label={
                        marked ? saveDestinationMessages.unpinAction : saveDestinationMessages.pinAction
                      }
                      onClick={() => handleToggle(row)}
                    >
                      {marked ? "✓" : "+"}
                    </button>
                  </div>
                  {visitedCity || visitedPark ? (
                    <button
                      type="button"
                      className="save-destination-modal__edit"
                      onClick={() => {
                        setEditingCityId(visitedCity?.id ?? null);
                        setEditingParkId(visitedPark?.id ?? null);
                      }}
                      aria-label={
                        visitedCity
                          ? saveDestinationMessages.editCity
                          : saveDestinationMessages.editPark
                      }
                    >
                      {commonMessages.edit}
                    </button>
                  ) : null}
                </li>
              );
            })}

              {showCustomCity ? (
                <li className="save-destination-modal__item">
                  <div className="save-destination-modal__row save-destination-modal__row--custom">
                    <span className="save-destination-modal__flag save-destination-modal__flag--custom" aria-hidden>
                      📍
                    </span>
                    <span className="save-destination-modal__text">
                      <span className="save-destination-modal__name">
                        {saveDestinationMessages.addCustomCity.replace("{name}", formattedQueryName)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="save-destination-modal__check"
                      aria-label={saveDestinationMessages.pinAction}
                      onClick={() => promptCustomCity()}
                    >
                      +
                    </button>
                  </div>
                </li>
              ) : null}

              {showCustomPark ? (
                <li className="save-destination-modal__item">
                  <div className="save-destination-modal__row save-destination-modal__row--custom">
                    <span className="save-destination-modal__flag save-destination-modal__flag--custom" aria-hidden>
                      🏞️
                    </span>
                    <span className="save-destination-modal__text">
                      <span className="save-destination-modal__name">
                        {saveDestinationMessages.addCustomPark.replace("{name}", formattedQueryName)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="save-destination-modal__check"
                      aria-label={saveDestinationMessages.pinAction}
                      onClick={() => promptCustomPark()}
                    >
                      +
                    </button>
                  </div>
                </li>
              ) : null}

              {rows.length === 0 && !showCustomCity && !showCustomPark && trimmedQuery.length >= 2 ? (
                <li className="save-destination-modal__empty">{saveDestinationMessages.empty}</li>
              ) : null}
            </>
        </ul>
        )}
      </div>
    </div>
  );
}
