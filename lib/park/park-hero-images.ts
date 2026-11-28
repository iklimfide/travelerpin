import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { findParkHubSlug } from "@/lib/data/park-hubs";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import { resolvePublicMediaImageUrl } from "@/lib/storage/hub-photo-url";
import { parkPath } from "@/lib/seo/site";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import {
  fetchWithTimeoutMs,
  SUPABASE_HERO_FETCH_TIMEOUT_MS,
} from "@/lib/supabase/fetch";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { buildParkSlug } from "@/lib/utils/park-slug";
import { getDefaultParkHeroImage } from "@/lib/utils/park-hero-image";
import type { ParkType } from "@/types/database";

export const PARK_HERO_IMAGES_CACHE_TAG = "yp-park-hero-images";

/** Custom catalog park heroes from YP / R2 (`yp_park_hero_image`). */
export const PARK_CUSTOM_HERO_IMAGES_ENABLED = true;

export type ParkHeroImageRow = {
  countryCode: string;
  parkType: ParkType;
  nameKey: string;
  parkName: string;
  imageUrl: string;
};

export function parkHeroLookupKey(
  countryCode: string,
  parkName: string,
  parkType: ParkType
): string {
  const code = countryCode.toUpperCase();
  const canonical = formatCityDisplayName(parkName);
  return `${code}:${parkType}:${catalogNameKey(canonical, code)}`;
}

export function parkHeroR2ObjectKey(
  countryCode: string,
  parkType: ParkType,
  nameKey: string,
  extension = "webp"
): string {
  return `park-heroes/${countryCode.toLowerCase()}/${parkType}/${nameKey}.${extension}`;
}

export function parkHeroR2ObjectKeys(
  countryCode: string,
  parkType: ParkType,
  nameKey: string
): string[] {
  return ["webp", "jpg", "jpeg", "png"].map((extension) =>
    parkHeroR2ObjectKey(countryCode, parkType, nameKey, extension)
  );
}

function isMissingRelationError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("schema cache") ||
    lower.includes("could not find the table")
  );
}

function createHeroPublicClient() {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  return createClient(env.url, env.key, {
    global: { fetch: fetchWithTimeoutMs(SUPABASE_HERO_FETCH_TIMEOUT_MS) },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function fetchParkHeroImageRecordUncached(): Promise<Record<string, string>> {
  const client = createHeroPublicClient();
  const record: Record<string, string> = {};
  if (!client) return record;

  const { data, error } = await client
    .from("yp_park_hero_image")
    .select("country_code, park_type, name_key, park_name, image_url");

  if (error) {
    if (isMissingRelationError(error.message)) {
      return record;
    }
    throw new Error(`yp_park_hero_image read failed: ${error.message}`);
  }

  for (const row of data ?? []) {
    const code = String(row.country_code ?? "").toUpperCase();
    const parkType = String(row.park_type ?? "") as ParkType;
    const nameKey = String(row.name_key ?? "").trim();
    const parkName = String(row.park_name ?? "").trim();
    const imageUrl = String(row.image_url ?? "").trim();
    if (!code || !parkType || !nameKey || !imageUrl) continue;

    record[`${code}:${parkType}:${nameKey}`] = imageUrl;
    if (parkName) {
      const fromParkName = catalogNameKey(parkName, code);
      if (fromParkName && fromParkName !== nameKey) {
        record[`${code}:${parkType}:${fromParkName}`] = imageUrl;
      }
    }
  }

  return record;
}

const PARK_HERO_DATA_CACHE_SECONDS = 3_600;
const PARK_HERO_MEMORY_TTL_MS = PARK_HERO_DATA_CACHE_SECONDS * 1_000;

const getDataCachedParkHeroImageRecord = unstable_cache(
  fetchParkHeroImageRecordUncached,
  ["yp-park-hero-images-map-v2"],
  { revalidate: PARK_HERO_DATA_CACHE_SECONDS, tags: [PARK_HERO_IMAGES_CACHE_TAG] }
);

type MemoryHeroRecord = {
  record: Record<string, string>;
  expiresAt: number;
};

let memoryHeroRecord: MemoryHeroRecord | null = null;

export function peekCachedParkHeroImageMap(): Map<string, string> | null {
  if (!PARK_CUSTOM_HERO_IMAGES_ENABLED) return new Map();
  if (!memoryHeroRecord || memoryHeroRecord.expiresAt <= Date.now()) {
    return null;
  }
  return new Map(Object.entries(memoryHeroRecord.record));
}

function rememberParkHeroRecord(record: Record<string, string>): void {
  memoryHeroRecord = {
    record,
    expiresAt: Date.now() + PARK_HERO_MEMORY_TTL_MS,
  };
}

export function clearParkHeroImageMemoryCache(): void {
  memoryHeroRecord = null;
}

export async function getCachedParkHeroImageMap(): Promise<Map<string, string>> {
  if (!PARK_CUSTOM_HERO_IMAGES_ENABLED) return new Map();

  const peeked = peekCachedParkHeroImageMap();
  if (peeked) return peeked;

  try {
    const record = await getDataCachedParkHeroImageRecord();
    rememberParkHeroRecord(record);
    return new Map(Object.entries(record));
  } catch (error) {
    console.error(
      "yp_park_hero_image read failed:",
      error instanceof Error ? error.message : error
    );
    return new Map();
  }
}

export function toParkHeroDisplayUrl(
  storedUrl: string | null | undefined,
  parkType: ParkType
): string {
  if (!storedUrl?.trim()) return getDefaultParkHeroImage(parkType);
  return resolvePublicMediaImageUrl(storedUrl.trim()) ?? storedUrl.trim();
}

export function resolveParkHeroImageUrl(
  countryCode: string,
  parkName: string,
  parkType: ParkType,
  heroMap: ReadonlyMap<string, string>
): string {
  if (!PARK_CUSTOM_HERO_IMAGES_ENABLED) return getDefaultParkHeroImage(parkType);

  const code = countryCode.toUpperCase();
  const lookupKeys = new Set<string>([
    parkHeroLookupKey(code, parkName, parkType),
    parkHeroLookupKey(code, formatCityDisplayName(parkName), parkType),
  ]);

  for (const key of lookupKeys) {
    const stored = heroMap.get(key);
    if (stored) return toParkHeroDisplayUrl(stored, parkType);
  }

  return getDefaultParkHeroImage(parkType);
}

export async function revalidateAllParkHeroCaches(): Promise<void> {
  const { revalidateTag } = await import("next/cache");
  clearParkHeroImageMemoryCache();
  revalidateTag(PARK_HERO_IMAGES_CACHE_TAG, "max");
}

export async function revalidateParkHeroCaches(
  countryCode: string,
  parkName: string,
  parkType: ParkType
): Promise<void> {
  const { revalidatePath } = await import("next/cache");
  await revalidateAllParkHeroCaches();

  const code = countryCode.toUpperCase();
  const canonical = formatCityDisplayName(parkName);
  const slug =
    findParkHubSlug(canonical, code) ??
    findParkHubSlug(parkName, code) ??
    buildParkSlug(canonical, code);
  revalidatePath(parkPath(slug));
}

export async function getParkHeroImageUrl(
  countryCode: string,
  parkName: string,
  parkType: ParkType
): Promise<string> {
  if (!PARK_CUSTOM_HERO_IMAGES_ENABLED) return getDefaultParkHeroImage(parkType);

  const heroMap = await getCachedParkHeroImageMap();
  return resolveParkHeroImageUrl(countryCode, parkName, parkType, heroMap);
}

export function serializeParkHeroImageMap(
  heroMap: ReadonlyMap<string, string>
): Record<string, string> {
  return Object.fromEntries(
    [...heroMap.entries()].map(([key, url]) => {
      const parkType = key.split(":")[1] as ParkType;
      return [key, toParkHeroDisplayUrl(url, parkType)];
    })
  );
}

export function canonicalCatalogParkName(parkName: string): string {
  return formatCityDisplayName(parkName);
}
