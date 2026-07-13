import { getCountryName } from "@/lib/data/countries";
import {
  notifyNextRouteChanged,
  readOwnNextRouteCache,
  writeOwnNextRouteCache,
} from "@/lib/client/session-page-cache";
import {
  buildCityStop,
  buildCountryStop,
  NEXT_ROUTE_MAX_STOPS,
  parseNextRoute,
  stopDedupeKey,
} from "@/lib/utils/next-route";
import { canonicalCityKey, canonicalCityName } from "@/lib/utils/city-aliases";
import type { NextRouteStop } from "@/types/database";

function citySelectionKey(countryCode: string, cityName: string): string {
  return canonicalCityKey(countryCode, cityName);
}

type FetchNextRouteResult =
  | { ok: true; stops: NextRouteStop[]; fromCache: boolean }
  | { ok: false; status: number };

let backgroundRefresh: Promise<void> | null = null;

async function fetchNextRouteFromNetwork(): Promise<FetchNextRouteResult> {
  const res = await fetch("/api/me/next-route");
  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  const data = (await res.json()) as { stops?: unknown };
  const stops = parseNextRoute(data.stops);
  writeOwnNextRouteCache(stops);
  notifyNextRouteChanged(stops);
  return { ok: true, stops, fromCache: false };
}

function refreshNextRouteInBackground(): void {
  if (backgroundRefresh) return;

  backgroundRefresh = (async () => {
    try {
      await fetchNextRouteFromNetwork();
    } catch {
      // Keep cached route when refresh fails.
    } finally {
      backgroundRefresh = null;
    }
  })();
}

export async function fetchNextRoute(options?: {
  preferCache?: boolean;
  force?: boolean;
}): Promise<FetchNextRouteResult> {
  const preferCache = options?.preferCache ?? true;
  const force = options?.force ?? false;

  if (preferCache && !force) {
    const cached = readOwnNextRouteCache();
    if (cached) {
      refreshNextRouteInBackground();
      return { ok: true, stops: cached, fromCache: true };
    }
  }

  try {
    return await fetchNextRouteFromNetwork();
  } catch {
    return { ok: false, status: 503 };
  }
}

export function routeCountryCodes(stops: NextRouteStop[]): Set<string> {
  return new Set(
    stops
      .filter((stop) => stop.kind === "country" && stop.countryCode)
      .map((stop) => stop.countryCode!.toUpperCase())
  );
}

export function routeCityKeys(stops: NextRouteStop[]): Set<string> {
  const keys = new Set<string>();
  for (const stop of stops) {
    if (stop.kind !== "city" || !stop.countryCode) continue;
    keys.add(citySelectionKey(stop.countryCode, stop.name));
  }
  return keys;
}

function parseCityKey(key: string): { countryCode: string; cityName: string } {
  const colon = key.indexOf(":");
  return {
    countryCode: key.slice(0, colon).toUpperCase(),
    cityName: key.slice(colon + 1),
  };
}

export async function savePendingNextRouteStops(params: {
  existingStops: NextRouteStop[];
  pendingCountryCodes: Iterable<string>;
  pendingCityKeys: Iterable<string>;
}): Promise<
  | { ok: true; savedCount: number; stops: NextRouteStop[] }
  | { ok: false; error: string }
> {
  const dedupe = new Set(params.existingStops.map((stop) => stopDedupeKey(stop)));
  const next = [...params.existingStops];
  let savedCount = 0;

  for (const rawCode of params.pendingCountryCodes) {
    if (next.length >= NEXT_ROUTE_MAX_STOPS) break;

    const code = rawCode.toUpperCase();
    const name = getCountryName(code);
    const stop = buildCountryStop(code, name);
    const key = stopDedupeKey(stop);
    if (dedupe.has(key)) continue;

    dedupe.add(key);
    next.push(stop);
    savedCount += 1;
  }

  for (const cityKey of params.pendingCityKeys) {
    if (next.length >= NEXT_ROUTE_MAX_STOPS) break;

    const { countryCode, cityName } = parseCityKey(cityKey);
    const canonicalName = canonicalCityName(countryCode, cityName);
    const stop = buildCityStop(canonicalName, countryCode, getCountryName(countryCode));
    const key = stopDedupeKey(stop);
    if (dedupe.has(key)) continue;

    dedupe.add(key);
    next.push(stop);
    savedCount += 1;
  }

  if (savedCount === 0) {
    return { ok: true, savedCount: 0, stops: next };
  }

  const res = await fetch("/api/me/next-route", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stops: next }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: (data.error as string) ?? "Failed to save next route",
    };
  }

  const data = (await res.json()) as { stops?: unknown };
  const savedStops = parseNextRoute(data.stops);
  notifyNextRouteChanged(savedStops);
  return { ok: true, savedCount, stops: savedStops };
}
