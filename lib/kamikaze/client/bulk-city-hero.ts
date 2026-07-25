import { invalidateCachedHeroImages } from "@/lib/client/hero-images-cache";
import {
  fetchKamikazeCityCustomHeroMap,
  invalidateKamikazeCustomHeroCache,
} from "@/lib/kamikaze/client/kamikaze-custom-hero-cache";
import { fetchStockPhotoPage } from "@/lib/kamikaze/client/stock-photo-search-cache";

export const BULK_CITY_HERO_DELAY_MS = 500;

export type BulkCityHeroTarget = {
  countryCode: string;
  cityName: string;
};

export type BulkCityHeroProgress = {
  current: number;
  total: number;
  cityName: string;
};

export type BulkCityHeroResult = {
  assigned: number;
  failed: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
): Promise<void> {
  const formData = new FormData();
  formData.set("countryCode", countryCode);
  formData.set("cityName", cityName);
  formData.set("imageUrl", imageUrl);

  const res = await fetch("/api/kamikaze/city-images", { method: "POST", body: formData });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Görsel yüklenemedi");
  }
}

export async function assignBulkCityHeroes(
  targets: BulkCityHeroTarget[],
  options?: {
    onProgress?: (progress: BulkCityHeroProgress) => void;
  }
): Promise<BulkCityHeroResult> {
  let assigned = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i += 1) {
    const row = targets[i];
    options?.onProgress?.({ current: i + 1, total: targets.length, cityName: row.cityName });
    try {
      const imageUrl = await fetchFirstStockImageUrl(row.cityName);
      if (!imageUrl) {
        failed += 1;
      } else {
        await uploadCityHeroFromUrl(row.countryCode, row.cityName, imageUrl);
        assigned += 1;
      }
    } catch {
      failed += 1;
    }
    if (i < targets.length - 1) {
      await sleep(BULK_CITY_HERO_DELAY_MS);
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
