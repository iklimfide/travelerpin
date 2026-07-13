import { addCitiesBatch, addCity } from "@/lib/client/city-actions";
import { addVisitedCountry } from "@/lib/client/country-actions";
import { getCountryName } from "@/lib/data/countries";
import { catalogCountryCode } from "@/lib/data/uk-nations";
import { canonicalCityName, citiesAreSame } from "@/lib/utils/city-aliases";
import {
  notifyTravelStateUpdated,
  readTravelStateCache,
  type TravelStateData,
  writeTravelStateCache,
} from "@/lib/client/session-page-cache";
import type { VisitedCity } from "@/types/database";

export type { TravelStateData };

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
  writeTravelStateCache(data);
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

function parseCityKey(key: string): { countryCode: string; cityName: string } {
  const colon = key.indexOf(":");
  return {
    countryCode: key.slice(0, colon).toUpperCase(),
    cityName: key.slice(colon + 1),
  };
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

async function resolveCityCoords(
  countryCode: string,
  cityNames: string[]
): Promise<Map<string, { latitude: number; longitude: number }>> {
  const res = await fetch(
    `/api/cities/tourist?country=${encodeURIComponent(catalogCountryCode(countryCode))}`
  );
  if (!res.ok) return new Map();

  const data = (await res.json()) as {
    cities?: { name: string; latitude: number; longitude: number }[];
  };

  const coords = new Map<string, { latitude: number; longitude: number }>();
  for (const cityName of cityNames) {
    const canonicalName = canonicalCityName(countryCode, cityName);
    const match = (data.cities ?? []).find(
      (city) =>
        city.name.toLowerCase() === cityName.toLowerCase() ||
        citiesAreSame(countryCode, city.name, cityName)
    );
    if (match) {
      coords.set(cityName, {
        latitude: match.latitude,
        longitude: match.longitude,
      });
      if (canonicalName !== cityName) {
        coords.set(canonicalName, {
          latitude: match.latitude,
          longitude: match.longitude,
        });
      }
    }
  }

  return coords;
}

export async function savePendingDestinations(params: {
  pendingCountryCodes: Iterable<string>;
  pendingCityKeys: Iterable<string>;
  visitedCodes: ReadonlySet<string>;
  visitedCities: VisitedCity[];
}): Promise<{ ok: true; savedCount: number } | { ok: false; error: string }> {
  const pendingCountryCodes = [...params.pendingCountryCodes];
  const pendingCityKeys = [...params.pendingCityKeys];

  const countriesWithPendingCities = new Set(
    pendingCityKeys.map((key) => parseCityKey(key).countryCode)
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

  const citiesByCountry = new Map<string, string[]>();
  for (const key of pendingCityKeys) {
    const { countryCode, cityName } = parseCityKey(key);
    const canonicalName = canonicalCityName(countryCode, cityName);
    if (isCityOnMap(params.visitedCities, countryCode, canonicalName)) continue;

    const list = citiesByCountry.get(countryCode) ?? [];
    list.push(canonicalName);
    citiesByCountry.set(countryCode, list);
  }

  for (const [countryCode, cityNames] of citiesByCountry) {
    const countryName = getCountryName(countryCode);
    const coords = await resolveCityCoords(countryCode, cityNames);
    const withCoords: { city_name: string; latitude: number; longitude: number }[] = [];
    const withoutCoords: string[] = [];

    for (const cityName of cityNames) {
      const match = coords.get(cityName);
      if (match) {
        withCoords.push({
          city_name: cityName,
          latitude: match.latitude,
          longitude: match.longitude,
        });
      } else {
        withoutCoords.push(cityName);
      }
    }

    for (let index = 0; index < withCoords.length; index += 50) {
      const chunk = withCoords.slice(index, index + 50);
      const result = await addCitiesBatch({
        country_code: countryCode,
        country_name: countryName,
        cities: chunk,
      });
      if (!result.ok) return result;
      savedCount += result.added;
    }

    for (const cityName of withoutCoords) {
      const result = await addCity({
        city_name: cityName,
        country_code: countryCode,
        country_name: countryName,
      });
      if (!result.ok) return result;
      savedCount += 1;
    }
  }

  return { ok: true, savedCount };
}
