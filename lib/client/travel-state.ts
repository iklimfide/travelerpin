import {
  addCitiesBatch,
} from "@/lib/client/city-actions";
import { addVisitedCountry } from "@/lib/client/country-actions";
import { getCountryName } from "@/lib/data/countries";
import { canonicalCityName, citiesAreSame } from "@/lib/utils/city-aliases";
import {
  notifyTravelStateUpdated,
  readTravelStateCache,
  type TravelStateData,
} from "@/lib/client/session-page-cache";
import type { VisitedCity } from "@/types/database";

export type { TravelStateData };

export type PendingCitySelection = {
  countryCode: string;
  cityName: string;
};

type FetchTravelStateResult =
  | { ok: true; data: TravelStateData; fromCache: boolean }
  | { ok: false; status: number };

let backgroundRefresh: Promise<void> | null = null;

function normalizeTravelStateData(raw: Partial<TravelStateData>): TravelStateData {
  return {
    visitedCountries: raw.visitedCountries ?? [],
    visitedCities: raw.visitedCities ?? [],
    visitedParks: raw.visitedParks ?? [],
    wishlistCountries: raw.wishlistCountries ?? [],
    stats: raw.stats ?? { countries: 0, cities: 0, nationalParks: 0, themeParks: 0 },
    visitedCodes: raw.visitedCodes ?? [],
  };
}

async function fetchTravelStateFromNetwork(): Promise<FetchTravelStateResult> {
  const res = await fetch("/api/me/travel-state");
  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  const data = normalizeTravelStateData((await res.json()) as Partial<TravelStateData>);
  notifyTravelStateUpdated(data);
  return { ok: true, data, fromCache: false };
}

function refreshTravelStateInBackground(): void {
  if (backgroundRefresh) return;

  backgroundRefresh = (async () => {
    try {
      await fetchTravelStateFromNetwork();
    } catch {
      // Keep cached state when refresh fails.
    } finally {
      backgroundRefresh = null;
    }
  })();
}

export async function fetchTravelState(options?: {
  preferCache?: boolean;
  force?: boolean;
}): Promise<FetchTravelStateResult> {
  const preferCache = options?.preferCache ?? true;
  const force = options?.force ?? false;

  if (preferCache && !force) {
    const cached = readTravelStateCache();
    if (cached) {
      refreshTravelStateInBackground();
      return { ok: true, data: cached, fromCache: true };
    }
  }

  try {
    return await fetchTravelStateFromNetwork();
  } catch {
    return { ok: false, status: 503 };
  }
}

/** Fire-and-forget full travel-state sync (does not block Save UI). */
export function refreshTravelStateAfterSave(): void {
  void fetchTravelStateFromNetwork().catch(() => {
    // Keep existing cache if refresh fails.
  });
}

function isCityOnMap(
  visitedCities: VisitedCity[],
  countryCode: string,
  cityName: string
): boolean {
  return visitedCities.some(
    (city) =>
      city.country_code.toUpperCase() === countryCode.toUpperCase() &&
      citiesAreSame(countryCode, city.city_name, cityName)
  );
}

export async function savePendingDestinations(params: {
  pendingCountryCodes: Iterable<string>;
  pendingCities: Iterable<PendingCitySelection>;
  visitedCodes: ReadonlySet<string>;
  visitedCities: VisitedCity[];
}): Promise<{ ok: true; savedCount: number } | { ok: false; error: string }> {
  const pendingCountryCodes = [...params.pendingCountryCodes];
  const pendingCities = [...params.pendingCities];

  const countriesWithPendingCities = new Set(
    pendingCities.map((city) => city.countryCode.toUpperCase())
  );

  const newCountryCodes = pendingCountryCodes
    .map((code) => code.toUpperCase())
    .filter((code) => !params.visitedCodes.has(code))
    .filter((code) => !countriesWithPendingCities.has(code));

  let savedCount = 0;

  for (const code of newCountryCodes) {
    const result = await addVisitedCountry(code);
    if (!result.ok) return result;
    savedCount += 1;
  }

  const citiesByCountry = new Map<string, { city_name: string }[]>();

  for (const city of pendingCities) {
    const countryCode = city.countryCode.toUpperCase();
    const canonicalName = canonicalCityName(countryCode, city.cityName);
    if (isCityOnMap(params.visitedCities, countryCode, canonicalName)) continue;

    const list = citiesByCountry.get(countryCode) ?? [];
    list.push({ city_name: canonicalName });
    citiesByCountry.set(countryCode, list);
  }

  for (const [countryCode, cities] of citiesByCountry) {
    const countryName = getCountryName(countryCode);

    for (let index = 0; index < cities.length; index += 50) {
      const chunk = cities.slice(index, index + 50);
      const result = await addCitiesBatch({
        country_code: countryCode,
        country_name: countryName,
        cities: chunk,
      });
      if (!result.ok) return result;
      savedCount += result.added;
    }
  }

  return { ok: true, savedCount };
}
