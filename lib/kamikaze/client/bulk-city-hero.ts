import { invalidateCachedHeroImages } from "@/lib/client/hero-images-cache";
import { getCountryName } from "@/lib/data/countries";
import {
  fetchKamikazeCityCustomHeroMap,
  invalidateKamikazeCustomHeroCache,
} from "@/lib/kamikaze/client/kamikaze-custom-hero-cache";
import { fetchStockPhotoPage } from "@/lib/kamikaze/client/stock-photo-search-cache";

export const BULK_CITY_HERO_DELAY_MS = 900;

export type BulkCityHeroTarget = {
  countryCode: string;
  cityName: string;
};

export type BulkCityHeroProgress = {
  current: number;
  total: number;
  countryCode: string;
  cityName: string;
};

export type BulkCityHeroAssigned = {
  countryCode: string;
  cityName: string;
  imageUrl: string;
};

export type BulkCityHeroResult = {
  assigned: number;
  failed: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Disambiguate plant/person/food names ("Orange", "Dali") toward a place photo. */
export function stockQueryForCity(cityName: string, countryCode?: string | null): string {
  const name = cityName.trim();
  if (!name) return name;

  const country = countryCode ? getCountryName(countryCode, "en").trim() : "";
  const nameLower = name.toLowerCase();
  const parts = [name];

  if (country && !nameLower.includes(country.toLowerCase())) {
    parts.push(country);
  }
  if (!/\bcity\b/i.test(name)) {
    parts.push("city");
  }

  return parts.join(" ");
}

export async function fetchFirstStockImageUrl(query: string): Promise<string | null> {
  const data = await fetchStockPhotoPage(query, 1);
  if (data.status !== 200) return null;
  const imageUrl = data.results?.[0]?.imageUrl?.trim();
  return imageUrl || null;
}

export async function uploadCityHeroFromUrl(
  countryCode: string,
  cityName: string,
  imageUrl: string
): Promise<string> {
  const formData = new FormData();
  formData.set("countryCode", countryCode);
  formData.set("cityName", cityName);
  formData.set("imageUrl", imageUrl);

  const res = await fetch("/api/kamikaze/city-images", { method: "POST", body: formData });
  const data = (await res.json()) as { image?: { imageUrl?: string }; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Görsel yüklenemedi");
  }
  return data.image?.imageUrl?.trim() || imageUrl;
}

export async function assignBulkCityHeroes(
  targets: BulkCityHeroTarget[],
  options?: {
    onProgress?: (progress: BulkCityHeroProgress) => void;
    onAssigned?: (assigned: BulkCityHeroAssigned) => void;
  }
): Promise<BulkCityHeroResult> {
  let assigned = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i += 1) {
    const row = targets[i];
    options?.onProgress?.({
      current: i + 1,
      total: targets.length,
      countryCode: row.countryCode,
      cityName: row.cityName,
    });
    try {
      const imageUrl = await fetchFirstStockImageUrl(
        stockQueryForCity(row.cityName, row.countryCode)
      );
      if (!imageUrl) {
        failed += 1;
      } else {
        const storedUrl = await uploadCityHeroFromUrl(row.countryCode, row.cityName, imageUrl);
        assigned += 1;
        options?.onAssigned?.({
          countryCode: row.countryCode,
          cityName: row.cityName,
          imageUrl: storedUrl,
        });
        await sleep(BULK_CITY_HERO_DELAY_MS);
      }
    } catch {
      failed += 1;
    }
  }

  if (assigned > 0) {
    invalidateCachedHeroImages();
    invalidateKamikazeCustomHeroCache("city");
  }

  return { assigned, failed };
}

export async function fetchCityHeroCustomLookupKeys(): Promise<Set<string>> {
  const map = await fetchKamikazeCityCustomHeroMap();
  return new Set(map.keys());
}
