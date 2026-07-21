import { addVisitedCountry } from "@/lib/client/country-actions";
import { quickAddDestination } from "@/lib/client/destination-actions";
import { getCountryName } from "@/lib/data/countries";
import {
  notifyNextRouteChanged,
  readOwnNextRouteCache,
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

async function fetchNextRouteFromNetwork(): Promise<FetchNextRouteResult> {
  const res = await fetch("/api/me/next-route");
  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  const data = (await res.json()) as { stops?: unknown };
  const stops = parseNextRoute(data.stops);
  notifyNextRouteChanged(stops);
  return { ok: true, stops, fromCache: false };
}

export async function fetchNextRoute(options?: {
  preferCache?: boolean;
  force?: boolean;
}): Promise<FetchNextRouteResult> {
  const preferCache = options?.preferCache ?? true;
  const force = options?.force ?? false;

  // Cache hit (including empty route): no network until a mutation.
  if (preferCache && !force) {
    const cached = readOwnNextRouteCache();
    if (cached !== null) {
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

export function mergePendingNextRouteStops(params: {
  existingStops: NextRouteStop[];
  pendingCountryCodes: Iterable<string>;
  pendingCityKeys: Iterable<string>;
}): { stops: NextRouteStop[]; savedCount: number } {
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

  return { stops: next, savedCount };
}

export async function savePendingNextRouteStops(params: {
  existingStops: NextRouteStop[];
  pendingCountryCodes: Iterable<string>;
  pendingCityKeys: Iterable<string>;
}): Promise<
  | { ok: true; savedCount: number; stops: NextRouteStop[] }
  | { ok: false; error: string }
> {
  const { stops: next, savedCount } = mergePendingNextRouteStops(params);

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

type PersistNextRouteOptions = {
  previousStops?: NextRouteStop[];
  onError?: (message: string) => void;
};

async function patchNextRouteStops(
  stops: NextRouteStop[]
): Promise<
  | { ok: true; stops: NextRouteStop[] }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/me/next-route", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stops }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: (data.error as string) ?? "Failed to save route",
    };
  }

  const data = (await res.json()) as { stops?: unknown };
  return { ok: true, stops: parseNextRoute(data.stops) };
}

/** Optimistic save: updates cache immediately, persists in the background. */
export function persistNextRouteStops(
  stops: NextRouteStop[],
  options?: PersistNextRouteOptions
): void {
  notifyNextRouteChanged(stops);

  void (async () => {
    const result = await patchNextRouteStops(stops);
    if (result.ok) {
      notifyNextRouteChanged(result.stops);
      return;
    }

    if (options?.previousStops) {
      notifyNextRouteChanged(options.previousStops);
    }
    options?.onError?.(result.error);
  })();
}

export async function saveNextRouteStops(
  stops: NextRouteStop[]
): Promise<
  | { ok: true; stops: NextRouteStop[] }
  | { ok: false; error: string }
> {
  const result = await patchNextRouteStops(stops);
  if (!result.ok) return result;

  notifyNextRouteChanged(result.stops);
  return result;
}

export async function markNextRouteStopVisited(params: {
  stop: NextRouteStop;
  currentStops: NextRouteStop[];
  alreadyVisited?: boolean;
}): Promise<
  | { ok: true; stops: NextRouteStop[]; added: boolean; alreadyHad: boolean }
  | { ok: false; error: string }
> {
  const { stop, currentStops, alreadyVisited = false } = params;
  const code = stop.countryCode?.toUpperCase();
  if (!code) {
    return { ok: false, error: "Missing country code" };
  }

  let added = false;
  let alreadyHad = alreadyVisited;

  if (!alreadyVisited) {
    if (stop.kind === "country") {
      const result = await addVisitedCountry(code);
      if (result.ok) {
        added = true;
      } else if (result.error === "Country already added") {
        alreadyHad = true;
      } else {
        return { ok: false, error: result.error };
      }
    } else {
      const countryName = stop.countryName ?? getCountryName(code);
      const result = await quickAddDestination({
        kind: "city",
        city_name: stop.name,
        country_code: code,
        country_name: countryName,
      });
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      added = result.added;
      alreadyHad = result.alreadyHad;
    }
  }

  const nextStops = currentStops.filter((entry) => entry.id !== stop.id);
  const saveResult = await saveNextRouteStops(nextStops);
  if (!saveResult.ok) {
    return { ok: false, error: saveResult.error };
  }

  return { ok: true, stops: saveResult.stops, added, alreadyHad };
}

export function persistMarkNextRouteStopVisited(params: {
  stop: NextRouteStop;
  currentStops: NextRouteStop[];
  alreadyVisited?: boolean;
  onError?: (message: string) => void;
  onAdded?: () => void;
}): void {
  const { stop, currentStops, alreadyVisited = false } = params;
  const previousStops = currentStops;
  const nextStops = currentStops.filter((entry) => entry.id !== stop.id);

  persistNextRouteStops(nextStops, {
    previousStops,
    onError: params.onError,
  });

  if (alreadyVisited) return;

  const code = stop.countryCode?.toUpperCase();
  if (!code) {
    params.onError?.("Missing country code");
    persistNextRouteStops(previousStops, { onError: params.onError });
    return;
  }

  void (async () => {
    if (stop.kind === "country") {
      const result = await addVisitedCountry(code);
      if (result.ok) {
        params.onAdded?.();
        return;
      }
      if (result.error === "Country already added") return;

      persistNextRouteStops(previousStops, { onError: params.onError });
      params.onError?.(result.error);
      return;
    }

    const countryName = stop.countryName ?? getCountryName(code);
    const result = await quickAddDestination({
      kind: "city",
      city_name: stop.name,
      country_code: code,
      country_name: countryName,
    });

    if (!result.ok) {
      persistNextRouteStops(previousStops, { onError: params.onError });
      params.onError?.(result.error);
      return;
    }

    if (result.added) {
      params.onAdded?.();
    }
  })();
}
