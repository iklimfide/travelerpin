import { cityHeroLookupKey } from "@/lib/city/city-hero-images";
import { parkHeroLookupKey } from "@/lib/park/park-hero-images";
import { YP_CACHE_KEYS, ypCacheGet, ypCacheInvalidate, ypCacheSet } from "@/lib/kamikaze/yp-client-cache";
import type { ParkType } from "@/types/database";

type KamikazeCityHeroRow = {
  countryCode: string;
  cityName: string;
  imageUrl: string;
};

type KamikazeParkHeroRow = {
  countryCode: string;
  parkName: string;
  parkType: ParkType;
  imageUrl: string;
};

type CachedHeroMapPayload = {
  loaded: boolean;
  entries: [string, string][];
};

function mapFromPayload(payload: CachedHeroMapPayload | null): Map<string, string> {
  if (!payload?.loaded) return new Map();
  return new Map(payload.entries);
}

function payloadFromMap(map: Map<string, string>): CachedHeroMapPayload {
  return { loaded: true, entries: [...map.entries()] };
}

let inFlightCity: Promise<Map<string, string>> | null = null;
let inFlightPark: Promise<Map<string, string>> | null = null;

function rowsToCityMap(rows: KamikazeCityHeroRow[]): Map<string, string> {
  const next = new Map<string, string>();
  for (const row of rows) {
    next.set(cityHeroLookupKey(row.countryCode, row.cityName), row.imageUrl);
  }
  return next;
}

function rowsToParkMap(rows: KamikazeParkHeroRow[]): Map<string, string> {
  const next = new Map<string, string>();
  for (const row of rows) {
    next.set(parkHeroLookupKey(row.countryCode, row.parkName, row.parkType), row.imageUrl);
  }
  return next;
}

async function fetchCityHeroMapFromNetwork(): Promise<Map<string, string>> {
  const res = await fetch("/api/kamikaze/city-images");
  if (!res.ok) return new Map();
  const data = (await res.json()) as { images?: KamikazeCityHeroRow[] };
  const map = rowsToCityMap(data.images ?? []);
  ypCacheSet(YP_CACHE_KEYS.kamikazeCityHeroImages, payloadFromMap(map));
  return map;
}

async function fetchParkHeroMapFromNetwork(): Promise<Map<string, string>> {
  const res = await fetch("/api/kamikaze/park-images");
  if (!res.ok) return new Map();
  const data = (await res.json()) as { images?: KamikazeParkHeroRow[] };
  const map = rowsToParkMap(data.images ?? []);
  ypCacheSet(YP_CACHE_KEYS.kamikazeParkHeroImages, payloadFromMap(map));
  return map;
}

export function invalidateKamikazeCustomHeroCache(scope?: "city" | "park"): void {
  if (!scope || scope === "city") {
    inFlightCity = null;
    ypCacheInvalidate("hero:kamikaze:city");
  }
  if (!scope || scope === "park") {
    inFlightPark = null;
    ypCacheInvalidate("hero:kamikaze:park");
  }
}

/** Session-cached YP city hero map; one GET per tab until invalidation. */
export async function fetchKamikazeCityCustomHeroMap(options?: {
  force?: boolean;
}): Promise<Map<string, string>> {
  if (!options?.force) {
    const cached = ypCacheGet<CachedHeroMapPayload>(YP_CACHE_KEYS.kamikazeCityHeroImages);
    if (cached?.loaded) return mapFromPayload(cached);
  }

  if (!inFlightCity) {
    inFlightCity = fetchCityHeroMapFromNetwork().finally(() => {
      inFlightCity = null;
    });
  }

  return inFlightCity;
}

/** Session-cached YP park hero map; one GET per tab until invalidation. */
export async function fetchKamikazeParkCustomHeroMap(options?: {
  force?: boolean;
}): Promise<Map<string, string>> {
  if (!options?.force) {
    const cached = ypCacheGet<CachedHeroMapPayload>(YP_CACHE_KEYS.kamikazeParkHeroImages);
    if (cached?.loaded) return mapFromPayload(cached);
  }

  if (!inFlightPark) {
    inFlightPark = fetchParkHeroMapFromNetwork().finally(() => {
      inFlightPark = null;
    });
  }

  return inFlightPark;
}
