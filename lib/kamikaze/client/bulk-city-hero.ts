import { invalidateCachedHeroImages } from "@/lib/client/hero-images-cache";
import { cityHeroLookupKey } from "@/lib/city/city-hero-images";

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
  const res = await fetch(
    `/api/kamikaze/stock-photos?q=${encodeURIComponent(query.trim())}&page=1`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: { imageUrl?: string }[] };
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
  }

  return { assigned, failed };
}

export async function fetchCityHeroCustomLookupKeys(): Promise<Set<string>> {
  const res = await fetch("/api/kamikaze/city-images");
  if (!res.ok) return new Set();
  const data = (await res.json()) as {
    images?: { countryCode: string; cityName: string }[];
  };
  const keys = new Set<string>();
  for (const row of data.images ?? []) {
    keys.add(cityHeroLookupKey(String(row.countryCode), String(row.cityName)));
  }
  return keys;
}
