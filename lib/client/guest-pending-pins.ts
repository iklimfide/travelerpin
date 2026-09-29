import {
  refreshTravelStateAfterSave,
  savePendingDestinations,
  savePendingParks,
  type PendingCitySelection,
  type PendingParkSelection,
} from "@/lib/client/travel-state";
import { getOwnUserId } from "@/lib/client/session-page-cache";
import type { ParkType } from "@/types/database";

const STORAGE_KEY = "tp:guest-pending-pins";

const PARK_TYPES = new Set<ParkType>([
  "national_park",
  "theme_park",
  "botanical_garden",
]);

export type GuestPendingPins = {
  countryCodes: string[];
  cities: PendingCitySelection[];
  parks: PendingParkSelection[];
};

let flushPromise: Promise<void> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCities(raw: unknown): PendingCitySelection[] {
  if (!Array.isArray(raw)) return [];
  const cities: PendingCitySelection[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const countryCode = typeof item.countryCode === "string" ? item.countryCode : "";
    const cityName = typeof item.cityName === "string" ? item.cityName : "";
    if (!countryCode || !cityName) continue;
    cities.push({ countryCode, cityName });
  }
  return cities;
}

function parseParks(raw: unknown): PendingParkSelection[] {
  if (!Array.isArray(raw)) return [];
  const parks: PendingParkSelection[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const countryCode = typeof item.countryCode === "string" ? item.countryCode : "";
    const countryName = typeof item.countryName === "string" ? item.countryName : "";
    const parkName = typeof item.parkName === "string" ? item.parkName : "";
    const parkType = item.parkType;
    if (!countryCode || !parkName || typeof parkType !== "string") continue;
    if (!PARK_TYPES.has(parkType as ParkType)) continue;
    const park: PendingParkSelection = {
      countryCode,
      countryName,
      parkName,
      parkType: parkType as ParkType,
    };
    if (typeof item.latitude === "number") park.latitude = item.latitude;
    if (typeof item.longitude === "number") park.longitude = item.longitude;
    parks.push(park);
  }
  return parks;
}

export function readGuestPendingPins(): GuestPendingPins | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const countryCodes = Array.isArray(parsed.countryCodes)
      ? parsed.countryCodes.filter((code): code is string => typeof code === "string" && code.length > 0)
      : [];
    const cities = parseCities(parsed.cities);
    const parks = parseParks(parsed.parks);
    if (countryCodes.length === 0 && cities.length === 0 && parks.length === 0) {
      return null;
    }
    return { countryCodes, cities, parks };
  } catch {
    return null;
  }
}

export function writeGuestPendingPins(data: GuestPendingPins): void {
  if (typeof window === "undefined") return;
  try {
    if (
      data.countryCodes.length === 0 &&
      data.cities.length === 0 &&
      data.parks.length === 0
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Private mode / blocked storage — guest will still be asked to sign up.
  }
}

export function clearGuestPendingPins(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** After sign-in, persist pins the guest chose before creating an account. */
export function flushGuestPendingPins(): Promise<void> {
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    try {
      if (!getOwnUserId()) return;
      const pending = readGuestPendingPins();
      if (!pending) return;

      const placesResult =
        pending.countryCodes.length > 0 || pending.cities.length > 0
          ? await savePendingDestinations({
              pendingCountryCodes: pending.countryCodes,
              pendingCities: pending.cities,
              visitedCodes: new Set(),
              visitedCities: [],
            })
          : { ok: true as const };

      const parksResult =
        pending.parks.length > 0
          ? await savePendingParks({
              pendingParks: pending.parks,
              visitedParks: [],
            })
          : { ok: true as const };

      if (placesResult.ok && parksResult.ok) {
        clearGuestPendingPins();
        refreshTravelStateAfterSave();
      }
    } finally {
      flushPromise = null;
    }
  })();

  return flushPromise;
}
