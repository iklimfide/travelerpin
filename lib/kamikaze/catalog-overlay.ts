import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { fetchWithTimeout } from "@/lib/supabase/fetch";
import type { CatalogCity } from "@/lib/add/city-catalog";
import type { TouristPark } from "@/lib/data/tourist-parks";
import { matchesParkTypeFilter } from "@/lib/utils/park-type";
import { matchesPlaceNameSearch } from "@/lib/utils/place-search";
import { sortCitiesForAddModal } from "@/lib/add/city-list-sort";
import { sortParksForAddModal } from "@/lib/add/park-list-sort";
import { catalogNameKey, type CatalogOverlayKind } from "@/lib/kamikaze/catalog-keys";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import {
  findCanonicalParksByLocalizedQuery,
  parkMatchesLocalizedSearch,
  resolveParkNameTr,
} from "@/lib/i18n/park-place-names";
import { resolveCityNameTr } from "@/lib/i18n/place-names";
import type { ParkType } from "@/types/database";

export { sortCitiesForAddModal };

/**
 * Public overlay tables are RLS-readable with the anon key, but Add/city lists
 * must see the same rows YP writes via service role. Prefer admin on the server
 * so a RLS/policy gap cannot silently drop YP extras from the live catalog.
 */
function createOverlayReadClient() {
  const admin = createAdminSupabaseClient();
  if (admin) return admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    return createSupabaseClient(url, anon, {
      global: { fetch: fetchWithTimeout },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return null;
}

export type YpCatalogCityRow = {
  id: string;
  name: string;
  country_code: string;
  country_name: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type YpCatalogParkRow = {
  id: string;
  name: string;
  park_type: ParkType;
  country_code: string;
  country_name: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

/** Catalog search types require numbers; unknown coords fall back to 0. */
function catalogCoord(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export type YpCatalogExclusionRow = {
  id: string;
  kind: CatalogOverlayKind;
  country_code: string;
  name_key: string;
  created_at: string;
};

export type YpCityPopularityRow = {
  id: string;
  country_code: string;
  name_key: string;
  is_popular: boolean;
  created_at: string;
  updated_at: string;
};

export type YpParkPopularityRow = {
  id: string;
  country_code: string;
  name_key: string;
  park_type: ParkType;
  is_popular: boolean;
  created_at: string;
  updated_at: string;
};

export type YpCityNameTrRow = {
  id: string;
  country_code: string;
  name_key: string;
  name_tr: string;
  created_at: string;
  updated_at: string;
};

export type YpParkNameTrRow = {
  id: string;
  country_code: string;
  name_key: string;
  park_type: ParkType;
  name_tr: string;
  created_at: string;
  updated_at: string;
};

export type YpCountryNameTrRow = {
  id: string;
  country_code: string;
  name_tr: string;
  created_at: string;
  updated_at: string;
};

export type CatalogOverlaySnapshot = {
  cities: YpCatalogCityRow[];
  parks: YpCatalogParkRow[];
  exclusions: YpCatalogExclusionRow[];
  popularity: YpCityPopularityRow[];
  parkPopularity: YpParkPopularityRow[];
  nameTr: YpCityNameTrRow[];
  parkNameTr: YpParkNameTrRow[];
  countryNameTr: YpCountryNameTrRow[];
};

async function fetchCatalogOverlayUncached(): Promise<CatalogOverlaySnapshot> {
  const client = createOverlayReadClient();
  if (!client) {
    return {
      cities: [],
      parks: [],
      exclusions: [],
      popularity: [],
      parkPopularity: [],
      nameTr: [],
      parkNameTr: [],
      countryNameTr: [],
    };
  }

  const [
    citiesRes,
    parksRes,
    exclusionsRes,
    popularityRes,
    parkPopularityRes,
    nameTrRes,
    parkNameTrRes,
    countryNameTrRes,
  ] = await Promise.all([
    client.from("yp_catalog_cities").select("*").order("created_at", { ascending: false }),
    client.from("yp_catalog_parks").select("*").order("created_at", { ascending: false }),
    client.from("yp_catalog_exclusions").select("*").order("created_at", { ascending: false }),
    client.from("yp_city_popularity").select("*").order("updated_at", { ascending: false }),
    client.from("yp_park_popularity").select("*").order("updated_at", { ascending: false }),
    client.from("yp_city_name_tr").select("*").order("updated_at", { ascending: false }),
    client.from("yp_park_name_tr").select("*").order("updated_at", { ascending: false }),
    client.from("yp_country_name_tr").select("*").order("updated_at", { ascending: false }),
  ]);

  if (citiesRes.error) {
    console.error("yp_catalog_cities overlay read failed:", citiesRes.error.message);
  }
  if (parksRes.error) {
    console.error("yp_catalog_parks overlay read failed:", parksRes.error.message);
  }
  if (exclusionsRes.error) {
    console.error("yp_catalog_exclusions overlay read failed:", exclusionsRes.error.message);
  }

  return {
    cities: citiesRes.error ? [] : ((citiesRes.data ?? []) as YpCatalogCityRow[]),
    parks: parksRes.error ? [] : ((parksRes.data ?? []) as YpCatalogParkRow[]),
    exclusions: exclusionsRes.error
      ? []
      : ((exclusionsRes.data ?? []) as YpCatalogExclusionRow[]),
    // Table may be missing until migration 032 is applied.
    popularity: popularityRes.error
      ? []
      : ((popularityRes.data ?? []) as YpCityPopularityRow[]),
    // Table may be missing until migration 039 is applied.
    parkPopularity: parkPopularityRes.error
      ? []
      : ((parkPopularityRes.data ?? []) as YpParkPopularityRow[]),
    // Table may be missing until migration 035 is applied.
    nameTr: nameTrRes.error ? [] : ((nameTrRes.data ?? []) as YpCityNameTrRow[]),
    parkNameTr: parkNameTrRes.error ? [] : ((parkNameTrRes.data ?? []) as YpParkNameTrRow[]),
    // Table may be missing until migration 036 is applied.
    countryNameTr: countryNameTrRes.error
      ? []
      : ((countryNameTrRes.data ?? []) as YpCountryNameTrRow[]),
  };
}

export const getCatalogOverlay = unstable_cache(
  fetchCatalogOverlayUncached,
  ["yp-catalog-overlay"],
  { revalidate: 30, tags: ["yp-catalog-overlay"] }
);

/** Fresh read for Add modal so YP popular changes show immediately. */
export async function getCatalogOverlayFresh(): Promise<CatalogOverlaySnapshot> {
  return fetchCatalogOverlayUncached();
}

/** Lookup keys: `${COUNTRY}:${name_key}` (keys are Turkish-folded). */
export function exclusionSet(
  overlay: CatalogOverlaySnapshot,
  kind: CatalogOverlayKind
): Set<string> {
  const set = new Set<string>();
  for (const row of overlay.exclusions) {
    if (row.kind !== kind) continue;
    const code = row.country_code.toUpperCase();
    // Fold legacy DB keys ("göreme") and country aliases ("goreme").
    set.add(`${code}:${catalogNameKey(row.name_key, kind === "city" ? code : undefined)}`);
  }
  return set;
}

function isExcluded(
  excluded: Set<string>,
  countryCode: string,
  name: string
): boolean {
  return excluded.has(
    `${countryCode.toUpperCase()}:${catalogNameKey(name, countryCode)}`
  );
}

/** `${COUNTRY}:${name_key}` → force Popular on/off */
export function popularityOverrideMap(
  overlay: CatalogOverlaySnapshot
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const row of overlay.popularity) {
    const code = row.country_code.toUpperCase();
    map.set(`${code}:${catalogNameKey(row.name_key, code)}`, row.is_popular);
  }
  return map;
}

/** `${COUNTRY}:${name_key}:${park_type}` → force Popular on/off */
export function parkPopularityOverrideMap(
  overlay: CatalogOverlaySnapshot
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const row of overlay.parkPopularity) {
    const code = row.country_code.toUpperCase();
    map.set(`${code}:${catalogNameKey(row.name_key)}:${row.park_type}`, row.is_popular);
  }
  return map;
}

export function resolveParkPopular(
  countryCode: string,
  name: string,
  parkType: ParkType,
  overrides: Map<string, boolean>
): boolean {
  const code = countryCode.toUpperCase();
  return overrides.get(`${code}:${catalogNameKey(name)}:${parkType}`) === true;
}

/** Lookup keys: `${COUNTRY}:${name_key}` → Turkish display label. */
export function cityNameTrOverrideMap(
  overlay: CatalogOverlaySnapshot
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of overlay.nameTr) {
    const code = row.country_code.toUpperCase();
    const tr = row.name_tr.trim();
    if (!tr) continue;
    map.set(`${code}:${catalogNameKey(row.name_key, code)}`, tr);
  }
  return map;
}

export function attachCityNameTr<T extends { countryCode: string; name: string }>(
  cities: T[],
  overlay: CatalogOverlaySnapshot
): Array<T & { nameTr: string | null }> {
  const overrides = cityNameTrOverrideMap(overlay);
  return cities.map((city) => ({
    ...city,
    nameTr: resolveCityNameTr(city.countryCode, city.name, overrides),
  }));
}

export function parkNameTrOverrideMap(
  overlay: CatalogOverlaySnapshot
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of overlay.parkNameTr) {
    const code = row.country_code.toUpperCase();
    const tr = row.name_tr.trim();
    if (!tr) continue;
    map.set(`${code}:${catalogNameKey(row.name_key, code)}:${row.park_type}`, tr);
  }
  return map;
}

export function attachParkNameTr<T extends { countryCode: string; name: string; parkType: ParkType }>(
  parks: T[],
  overlay: CatalogOverlaySnapshot
): Array<T & { nameTr: string | null }> {
  const overrides = parkNameTrOverrideMap(overlay);
  return parks.map((park) => ({
    ...park,
    nameTr: resolveParkNameTr(park.countryCode, park.name, overrides, park.parkType),
  }));
}

/** Lookup keys: country code → Turkish display label. */
export function countryNameTrOverrideMap(
  overlay: CatalogOverlaySnapshot
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of overlay.countryNameTr) {
    const code = row.country_code.toUpperCase();
    const tr = row.name_tr.trim();
    if (!tr) continue;
    map.set(code, tr);
  }
  return map;
}

/** Apply YP popular flags only — clears any static catalog "Popular" highlights. */
export function applyCityPopularOverrides(
  cities: CatalogCity[],
  overlay: CatalogOverlaySnapshot
): CatalogCity[] {
  const overrides = popularityOverrideMap(overlay);

  return cities.map((city) => {
    const key = `${city.countryCode.toUpperCase()}:${catalogNameKey(city.name, city.countryCode)}`;
    const override = overrides.get(key);
    return { ...city, highlighted: override === true };
  });
}

export function buildCityTiers(
  cities: CatalogCity[],
  citiesPerTier = 20
): Array<{ level: number; cities: CatalogCity[] }> {
  if (cities.length === 0) return [];
  if (cities.length <= citiesPerTier) {
    return [{ level: 1, cities }];
  }

  const tiers: Array<{ level: number; cities: CatalogCity[] }> = [];
  for (let index = 0; index < cities.length; index += citiesPerTier) {
    tiers.push({
      level: tiers.length + 1,
      cities: cities.slice(index, index + citiesPerTier),
    });
  }
  return tiers;
}

export function applyCityOverlayToCatalogCities(
  cities: CatalogCity[],
  overlay: CatalogOverlaySnapshot,
  countryCode: string,
  query = "",
  options?: { includeExtras?: boolean }
): CatalogCity[] {
  const code = countryCode.toUpperCase();
  const excluded = exclusionSet(overlay, "city");
  const overrides = popularityOverrideMap(overlay);
  const q = query.trim();
  const includeExtras = options?.includeExtras !== false;

  const filtered = applyCityPopularOverrides(
    cities.filter((city) => !isExcluded(excluded, city.countryCode, city.name)),
    overlay
  );

  if (!includeExtras) {
    return filtered;
  }

  const existingKeys = new Set(
    filtered.map(
      (city) => `${city.countryCode.toUpperCase()}:${catalogNameKey(city.name, city.countryCode)}`
    )
  );

  const extras: CatalogCity[] = [];
  for (const row of overlay.cities) {
    if (row.country_code.toUpperCase() !== code) continue;
    const key = `${code}:${catalogNameKey(row.name, code)}`;
    // YP rows always win over exclusions. Exclusions only hide static twins;
    // applying them here created invisible DB remnants that blocked re-adds.
    if (existingKeys.has(key)) continue;
    if (q.length >= 2 && !matchesPlaceNameSearch(row.name, q)) continue;

    const override = overrides.get(key);
    extras.push({
      countryCode: code,
      name: row.name,
      latitude: catalogCoord(row.latitude),
      longitude: catalogCoord(row.longitude),
      highlighted: override === true,
      isCapital: false,
    });
    existingKeys.add(key);
  }

  return applyCityPopularOverrides([...extras, ...filtered], overlay);
}

export function applyParkPopularOverrides<
  T extends { countryCode: string; name: string; parkType: ParkType; highlighted?: boolean },
>(parks: T[], overlay: CatalogOverlaySnapshot): Array<T & { highlighted: boolean }> {
  const overrides = parkPopularityOverrideMap(overlay);
  return parks.map((park) => ({
    ...park,
    highlighted: resolveParkPopular(park.countryCode, park.name, park.parkType, overrides),
  }));
}

export function applyParkOverlay(
  parks: TouristPark[],
  overlay: CatalogOverlaySnapshot,
  options?: {
    countryCode?: string;
    countryCodes?: string[];
    query?: string;
    parkType?: ParkType;
    limit?: number;
    locale?: Locale;
  }
): Array<TouristPark & { highlighted: boolean }> {
  const excluded = exclusionSet(overlay, "park");
  const q = options?.query?.trim() ?? "";
  const locale = options?.locale ?? defaultLocale;
  const allowed =
    options?.countryCodes?.map((c) => c.toUpperCase()) ??
    (options?.countryCode ? [options.countryCode.toUpperCase()] : null);
  const allowedSet = allowed ? new Set(allowed) : null;

  let results = parks.filter((park) => {
    if (allowedSet && !allowedSet.has(park.countryCode)) return false;
    if (!matchesParkTypeFilter(park.parkType, options?.parkType)) return false;
    return !isExcluded(excluded, park.countryCode, park.name);
  });

  const existingKeys = new Set(
    results.map((park) => `${park.countryCode}:${catalogNameKey(park.name)}`)
  );

  for (const row of overlay.parks) {
    const code = row.country_code.toUpperCase();
    if (allowedSet && !allowedSet.has(code)) continue;
    if (!matchesParkTypeFilter(row.park_type, options?.parkType)) continue;
    const key = `${code}:${catalogNameKey(row.name)}`;
    // YP park rows are not suppressed by exclusions (same ghost-row rule as cities).
    if (existingKeys.has(key)) continue;
    if (q.length >= 2 && !parkMatchesLocalizedSearch(code, row.name, q, locale)) continue;

    results.push({
      parkType: row.park_type,
      countryCode: code,
      countryName: row.country_name,
      name: row.name,
      latitude: catalogCoord(row.latitude),
      longitude: catalogCoord(row.longitude),
    });
    existingKeys.add(key);
  }

  if (q.length >= 2) {
    results = results.filter((park) =>
      parkMatchesLocalizedSearch(park.countryCode, park.name, q, locale)
    );

    if (locale === "tr") {
      for (const hit of findCanonicalParksByLocalizedQuery(q, locale)) {
        const code = hit.countryCode.toUpperCase();
        if (allowedSet && !allowedSet.has(code)) continue;
        const key = `${code}:${catalogNameKey(hit.parkName, code)}`;
        if (existingKeys.has(key) || isExcluded(excluded, code, hit.parkName)) continue;

        const fromCatalog = parks.find(
          (park) =>
            park.countryCode === code &&
            catalogNameKey(park.name, code) === catalogNameKey(hit.parkName, code)
        );
        if (!fromCatalog || !matchesParkTypeFilter(fromCatalog.parkType, options?.parkType)) {
          continue;
        }

        results.push(fromCatalog);
        existingKeys.add(key);
      }
    }
  }

  const withPopular = applyParkPopularOverrides(results, overlay);
  const sorted = sortParksForAddModal(withPopular);

  if (options?.limit != null) {
    return sorted.slice(0, options.limit);
  }
  return sorted;
}

export async function revalidateCatalogOverlay(): Promise<void> {
  const { revalidateTag } = await import("next/cache");
  revalidateTag("yp-catalog-overlay", "max");
}
