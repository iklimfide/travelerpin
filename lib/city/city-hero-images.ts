import { unstable_cache } from "next/cache";
import { DEFAULT_CITY_HERO_IMAGE } from "@/lib/constants";
import { findCityHubSlug } from "@/lib/data/city-hubs";
import { resolvePublicMediaImageUrl } from "@/lib/storage/hub-photo-url";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { cityPath } from "@/lib/seo/site";
import { canonicalCityName } from "@/lib/utils/city-aliases";
import { buildCitySlug } from "@/lib/utils/city-slug";
import { formatCityDisplayName } from "@/lib/utils/city-name";
export const CITY_HERO_IMAGES_CACHE_TAG = "yp-city-hero-images";

export type CityHeroImageRow = {
  countryCode: string;
  nameKey: string;
  cityName: string;
  imageUrl: string;
};

export function cityHeroLookupKey(countryCode: string, cityName: string): string {
  const code = countryCode.toUpperCase();
  return `${code}:${catalogNameKey(cityName, code)}`;
}

export function cityHeroR2ObjectKey(countryCode: string, nameKey: string, extension = "webp"): string {
  return `city-heroes/${countryCode.toLowerCase()}/${nameKey}.${extension}`;
}

export function cityHeroR2ObjectKeys(countryCode: string, nameKey: string): string[] {
  return ["webp", "jpg", "jpeg", "png"].map((extension) =>
    cityHeroR2ObjectKey(countryCode, nameKey, extension)
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

async function fetchCityHeroImageRecordUncached(): Promise<Record<string, string>> {
  const client = createPublicSupabaseClient();
  const record: Record<string, string> = {};
  if (!client) return record;

  const { data, error } = await client
    .from("yp_city_hero_image")
    .select("country_code, name_key, city_name, image_url");

  if (error) {
    if (!isMissingRelationError(error.message)) {
      console.error("yp_city_hero_image read failed:", error.message);
    }
    return record;
  }

  for (const row of data ?? []) {
    const code = String(row.country_code ?? "").toUpperCase();
    const nameKey = String(row.name_key ?? "").trim();
    const cityName = String(row.city_name ?? "").trim();
    const imageUrl = String(row.image_url ?? "").trim();
    if (!code || !nameKey || !imageUrl) continue;
    record[`${code}:${nameKey}`] = imageUrl;
    if (cityName) {
      const fromCityName = catalogNameKey(cityName, code);
      if (fromCityName && fromCityName !== nameKey) {
        record[`${code}:${fromCityName}`] = imageUrl;
      }
    }
  }

  return record;
}

const getCachedCityHeroImageRecord = unstable_cache(
  fetchCityHeroImageRecordUncached,
  ["yp-city-hero-images-map"],
  { revalidate: 300, tags: [CITY_HERO_IMAGES_CACHE_TAG] }
);

export async function getCachedCityHeroImageMap(): Promise<Map<string, string>> {
  const record = await getCachedCityHeroImageRecord();
  return new Map(Object.entries(record));
}

export function toCityHeroDisplayUrl(storedUrl: string | null | undefined): string {
  if (!storedUrl?.trim()) return DEFAULT_CITY_HERO_IMAGE;
  return resolvePublicMediaImageUrl(storedUrl.trim()) ?? storedUrl.trim();
}

export function resolveCityHeroImageUrl(
  countryCode: string,
  cityName: string,
  heroMap: ReadonlyMap<string, string>
): string {
  const code = countryCode.toUpperCase();
  const lookupKeys = new Set<string>([
    cityHeroLookupKey(code, cityName),
    cityHeroLookupKey(code, canonicalCityName(code, cityName)),
    cityHeroLookupKey(code, formatCityDisplayName(cityName)),
  ]);

  for (const key of lookupKeys) {
    const stored = heroMap.get(key);
    if (stored) return toCityHeroDisplayUrl(stored);
  }

  return DEFAULT_CITY_HERO_IMAGE;
}

export async function revalidateCityHeroCaches(
  countryCode: string,
  cityName: string
): Promise<void> {
  const { revalidatePath, revalidateTag } = await import("next/cache");
  revalidateTag(CITY_HERO_IMAGES_CACHE_TAG, "max");

  const code = countryCode.toUpperCase();
  const canonical = canonicalCityName(code, cityName);
  const slug =
    findCityHubSlug(code, canonical) ??
    findCityHubSlug(code, cityName) ??
    buildCitySlug(canonical);
  revalidatePath(cityPath(slug));
}

export async function getCityHeroImageUrl(countryCode: string, cityName: string): Promise<string> {
  const heroMap = await getCachedCityHeroImageMap();
  return resolveCityHeroImageUrl(countryCode, cityName, heroMap);
}

export function serializeCityHeroImageMap(
  heroMap: ReadonlyMap<string, string>
): Record<string, string> {
  return Object.fromEntries(
    [...heroMap.entries()].map(([key, url]) => [key, toCityHeroDisplayUrl(url)])
  );
}

export function canonicalCatalogCityName(countryCode: string, cityName: string): string {
  return canonicalCityName(countryCode, cityName);
}
