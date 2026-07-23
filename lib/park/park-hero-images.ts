import { unstable_cache } from "next/cache";
import { findParkHubSlug } from "@/lib/data/park-hubs";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import { resolvePublicMediaImageUrl } from "@/lib/storage/hub-photo-url";
import { parkPath } from "@/lib/seo/site";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { buildParkSlug } from "@/lib/utils/park-slug";
import { getDefaultParkHeroImage } from "@/lib/utils/park-hero-image";
import type { ParkType } from "@/types/database";

export const PARK_HERO_IMAGES_CACHE_TAG = "yp-park-hero-images";

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

async function fetchParkHeroImageRecordUncached(): Promise<Record<string, string>> {
  const client = createPublicSupabaseClient();
  const record: Record<string, string> = {};
  if (!client) return record;

  const { data, error } = await client
    .from("yp_park_hero_image")
    .select("country_code, park_type, name_key, park_name, image_url");

  if (error) {
    if (!isMissingRelationError(error.message)) {
      console.error("yp_park_hero_image read failed:", error.message);
    }
    return record;
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

const getCachedParkHeroImageRecord = unstable_cache(
  fetchParkHeroImageRecordUncached,
  ["yp-park-hero-images-map"],
  { revalidate: 300, tags: [PARK_HERO_IMAGES_CACHE_TAG] }
);

export async function getCachedParkHeroImageMap(): Promise<Map<string, string>> {
  const record = await getCachedParkHeroImageRecord();
  return new Map(Object.entries(record));
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

export async function revalidateParkHeroCaches(
  countryCode: string,
  parkName: string,
  parkType: ParkType
): Promise<void> {
  const { revalidatePath, revalidateTag } = await import("next/cache");
  revalidateTag(PARK_HERO_IMAGES_CACHE_TAG, "max");

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
