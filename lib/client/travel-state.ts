import {
  addCitiesBatch,
  deleteCitiesBatch,
} from "@/lib/client/city-actions";
import { addVisitedCountry } from "@/lib/client/country-actions";
import { addParksBatch, deleteParksBatch } from "@/lib/client/park-actions";
import { getCountryName } from "@/lib/data/countries";
import { canonicalCityName, citiesAreSame } from "@/lib/utils/city-aliases";
import {
  notifyTravelStateUpdated,
  readTravelStateCache,
  type TravelStateData,
} from "@/lib/client/session-page-cache";
import type { ParkType, VisitedCity, VisitedPark } from "@/types/database";

export type { TravelStateData };

export type PendingCitySelection = {
  countryCode: string;
  cityName: string;
};

export type PendingParkSelection = {
  countryCode: string;
  countryName: string;
  parkName: string;
  parkType: ParkType;
  latitude?: number;
  longitude?: number;
};

type FetchTravelStateResult =
  | { ok: true; data: TravelStateData; fromCache: boolean }
  | { ok: false; status: number };

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

export async function fetchTravelState(options?: {
  preferCache?: boolean;
  force?: boolean;
}): Promise<FetchTravelStateResult> {
  const preferCache = options?.preferCache ?? true;
  const force = options?.force ?? false;

  // Cache hit: no network until a pin/mutation forces refresh.
  if (preferCache && !force) {
    const cached = readTravelStateCache();
    if (cached) {
      return { ok: true, data: cached, fromCache: true };
    }
  }

  try {
    return await fetchTravelStateFromNetwork();
  } catch {
    return { ok: false, status: 503 };
  }
}

/** Fire-and-forget full travel-state sync after a save (does not block Save UI). */
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
  pendingRemoveCityIds?: Iterable<string>;
  visitedCodes: ReadonlySet<string>;
  visitedCities: VisitedCity[];
}): Promise<{ ok: true; savedCount: number } | { ok: false; error: string }> {
  const pendingCountryCodes = [...params.pendingCountryCodes];
  const pendingCities = [...params.pendingCities];
  const pendingRemoveCityIds = [...(params.pendingRemoveCityIds ?? [])];

  let savedCount = 0;

  if (pendingRemoveCityIds.length > 0) {
    const result = await deleteCitiesBatch({ ids: pendingRemoveCityIds });
    if (!result.ok) return result;
    savedCount += result.deleted;
  }

  const countriesWithPendingCities = new Set(
    pendingCities.map((city) => city.countryCode.toUpperCase())
  );

  const newCountryCodes = pendingCountryCodes
    .map((code) => code.toUpperCase())
    .filter((code) => !params.visitedCodes.has(code))
    .filter((code) => !countriesWithPendingCities.has(code));

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

function isParkOnMap(
  visitedParks: VisitedPark[],
  countryCode: string,
  parkName: string,
  parkType: ParkType
): boolean {
  const code = countryCode.toUpperCase();
  const name = parkName.trim().toLowerCase();
  return visitedParks.some(
    (park) =>
      park.country_code.toUpperCase() === code &&
      park.park_type === parkType &&
      park.park_name.trim().toLowerCase() === name
  );
}

export async function savePendingParks(params: {
  pendingParks: Iterable<PendingParkSelection>;
  pendingRemoveParkIds?: Iterable<string>;
  visitedParks: VisitedPark[];
}): Promise<{ ok: true; savedCount: number } | { ok: false; error: string }> {
  const pendingParks = [...params.pendingParks];
  const pendingRemoveParkIds = [...(params.pendingRemoveParkIds ?? [])];

  if (pendingParks.length === 0 && pendingRemoveParkIds.length === 0) {
    return { ok: true, savedCount: 0 };
  }

  let savedCount = 0;

  if (pendingRemoveParkIds.length > 0) {
    const result = await deleteParksBatch({ ids: pendingRemoveParkIds });
    if (!result.ok) return result;
    savedCount += result.deleted;
  }

  const parksByCountry = new Map<
    string,
    {
      countryName: string;
      parks: {
        park_name: string;
        park_type: ParkType;
        latitude?: number;
        longitude?: number;
      }[];
    }
  >();

  for (const park of pendingParks) {
    const countryCode = park.countryCode.toUpperCase();
    if (
      isParkOnMap(params.visitedParks, countryCode, park.parkName, park.parkType)
    ) {
      continue;
    }

    const entry = parksByCountry.get(countryCode) ?? {
      countryName: park.countryName || getCountryName(countryCode),
      parks: [],
    };
    entry.parks.push({
      park_name: park.parkName,
      park_type: park.parkType,
      latitude: park.latitude,
      longitude: park.longitude,
    });
    parksByCountry.set(countryCode, entry);
  }

  for (const [countryCode, { countryName, parks }] of parksByCountry) {
    for (let index = 0; index < parks.length; index += 50) {
      const chunk = parks.slice(index, index + 50);
      const result = await addParksBatch({
        country_code: countryCode,
        country_name: countryName,
        parks: chunk,
      });
      if (!result.ok) return result;
      savedCount += result.added;
    }
  }

  return { ok: true, savedCount };
}
