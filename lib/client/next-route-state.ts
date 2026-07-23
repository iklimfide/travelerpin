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
  parseNextRoutePayload,
  stopDedupeKey,
} from "@/lib/utils/next-route";
import { canonicalCityKey, canonicalCityName } from "@/lib/utils/city-aliases";
import type { NextRoutePayload, NextRouteStop } from "@/types/database";

function citySelectionKey(countryCode: string, cityName: string): string {
  return canonicalCityKey(countryCode, cityName);
}

type FetchNextRouteResult =
  | { ok: true; route: NextRoutePayload; fromCache: boolean }
  | { ok: false; status: number };

function mergeRouteMeta(base: NextRoutePayload, patch?: Partial<NextRoutePayload>): NextRoutePayload {
  const cached = readOwnNextRouteCache();
  const source = patch ?? cached ?? base;

  return {
    stops: base.stops,
    ...(source.totalDays !== undefined ? { totalDays: source.totalDays } : {}),
    ...(source.transport !== undefined ? { transport: source.transport } : {}),
  };
}

async function fetchNextRouteFromNetwork(): Promise<FetchNextRouteResult> {
  const res = await fetch("/api/me/next-route");
  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  const data = (await res.json()) as unknown;
  const route = parseNextRoutePayload(data);
  notifyNextRouteChanged(route);
  return { ok: true, route, fromCache: false };
}

export async function fetchNextRoute(options?: {
  preferCache?: boolean;
  force?: boolean;
}): Promise<FetchNextRouteResult> {
  const preferCache = options?.preferCache ?? true;
  const force = options?.force ?? false;

  if (preferCache && !force) {
    const cached = readOwnNextRouteCache();
    if (cached !== null) {
      return { ok: true, route: cached, fromCache: true };
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
  | { ok: true; savedCount: number; route: NextRoutePayload }
  | { ok: false; error: string }
> {
  const { stops: next, savedCount } = mergePendingNextRouteStops(params);
  const route = mergeRouteMeta({ stops: next });

  if (savedCount === 0) {
    return { ok: true, savedCount: 0, route };
  }

  const res = await fetch("/api/me/next-route", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(route),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: (data.error as string) ?? "Failed to save next route",
    };
  }

  const data = (await res.json()) as unknown;
  const savedRoute = parseNextRoutePayload(data);
  notifyNextRouteChanged(savedRoute);
  return { ok: true, savedCount, route: savedRoute };
}

type PersistNextRouteOptions = {
  previousRoute?: NextRoutePayload;
  onError?: (message: string) => void;
};

async function patchNextRoute(
  route: NextRoutePayload
): Promise<
  | { ok: true; route: NextRoutePayload }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/me/next-route", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(route),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      error: (data.error as string) ?? "Failed to save route",
    };
  }

  const data = (await res.json()) as unknown;
  return { ok: true, route: parseNextRoutePayload(data) };
}

export function persistNextRoute(route: NextRoutePayload, options?: PersistNextRouteOptions): void {
  notifyNextRouteChanged(route);

  void (async () => {
    const result = await patchNextRoute(route);
    if (result.ok) {
      notifyNextRouteChanged(result.route);
      return;
    }

    if (options?.previousRoute) {
      notifyNextRouteChanged(options.previousRoute);
    }
    options?.onError?.(result.error);
  })();
}

export function persistNextRouteStops(
  stops: NextRouteStop[],
  options?: PersistNextRouteOptions
): void {
  const previousRoute = options?.previousRoute ?? readOwnNextRouteCache() ?? { stops };
  const route = mergeRouteMeta({ stops }, previousRoute);
  persistNextRoute(route, {
    previousRoute: { ...previousRoute, stops: options?.previousRoute?.stops ?? previousRoute.stops },
    onError: options?.onError,
  });
}

export async function saveNextRouteStops(
  stops: NextRouteStop[]
): Promise<
  | { ok: true; route: NextRoutePayload }
  | { ok: false; error: string }
> {
  const route = mergeRouteMeta({ stops });
  const result = await patchNextRoute(route);
  if (!result.ok) return result;

  notifyNextRouteChanged(result.route);
  return result;
}

export async function markNextRouteStopVisited(params: {
  stop: NextRouteStop;
  currentStops: NextRouteStop[];
  alreadyVisited?: boolean;
}): Promise<
  | { ok: true; route: NextRoutePayload; added: boolean; alreadyHad: boolean }
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

  return { ok: true, route: saveResult.route, added, alreadyHad };
}

export function persistMarkNextRouteStopVisited(params: {
  stop: NextRouteStop;
  currentStops: NextRouteStop[];
  alreadyVisited?: boolean;
  onError?: (message: string) => void;
  onAdded?: () => void;
}): void {
  const { stop, currentStops, alreadyVisited = false } = params;
  const previousRoute = readOwnNextRouteCache() ?? { stops: currentStops };
  const previousStops = currentStops;
  const nextStops = currentStops.filter((entry) => entry.id !== stop.id);

  persistNextRouteStops(nextStops, {
    previousRoute: { ...previousRoute, stops: previousStops },
    onError: params.onError,
  });

  if (alreadyVisited) return;

  const code = stop.countryCode?.toUpperCase();
  if (!code) {
    params.onError?.("Missing country code");
    persistNextRouteStops(previousStops, {
      previousRoute: { ...previousRoute, stops: previousStops },
      onError: params.onError,
    });
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

      persistNextRouteStops(previousStops, {
        previousRoute: { ...previousRoute, stops: previousStops },
        onError: params.onError,
      });
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
      persistNextRouteStops(previousStops, {
        previousRoute: { ...previousRoute, stops: previousStops },
        onError: params.onError,
      });
      params.onError?.(result.error);
      return;
    }

    if (result.added) {
      params.onAdded?.();
    }
  })();
}
