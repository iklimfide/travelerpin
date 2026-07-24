import { invalidateCachedHeroImages } from "@/lib/client/hero-images-cache";
import { parkHeroLookupKey } from "@/lib/park/park-hero-images";
import type { ParkType } from "@/types/database";
import { fetchFirstStockImageUrl } from "@/lib/kamikaze/client/bulk-city-hero";

export const BULK_PARK_HERO_DELAY_MS = 500;

export type BulkParkHeroTarget = {
  countryCode: string;
  parkName: string;
  parkType: ParkType;
};

export type BulkParkHeroProgress = {
  current: number;
  total: number;
  parkName: string;
};

export type BulkParkHeroResult = {
  assigned: number;
  failed: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stockQueryForPark(parkName: string, parkType: ParkType): string {
  const name = parkName.trim();
  if (!name) return name;
  if (parkType === "national_park") return `${name} national park`;
  if (parkType === "theme_park") return `${name} theme park`;
  if (parkType === "botanical_garden") return `${name} botanical garden`;
  return name;
}

export async function uploadParkHeroFromUrl(
  countryCode: string,
  parkName: string,
  parkType: ParkType,
  imageUrl: string
): Promise<void> {
  const formData = new FormData();
  formData.set("countryCode", countryCode);
  formData.set("parkName", parkName);
  formData.set("parkType", parkType);
  formData.set("imageUrl", imageUrl);

  const res = await fetch("/api/kamikaze/park-images", { method: "POST", body: formData });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Görsel yüklenemedi");
  }
}

export async function assignBulkParkHeroes(
  targets: BulkParkHeroTarget[],
  options?: {
    onProgress?: (progress: BulkParkHeroProgress) => void;
  }
): Promise<BulkParkHeroResult> {
  let assigned = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i += 1) {
    const row = targets[i];
    options?.onProgress?.({ current: i + 1, total: targets.length, parkName: row.parkName });
    try {
      const imageUrl = await fetchFirstStockImageUrl(
        stockQueryForPark(row.parkName, row.parkType)
      );
      if (!imageUrl) {
        failed += 1;
      } else {
        await uploadParkHeroFromUrl(row.countryCode, row.parkName, row.parkType, imageUrl);
        assigned += 1;
      }
    } catch {
      failed += 1;
    }
    if (i < targets.length - 1) {
      await sleep(BULK_PARK_HERO_DELAY_MS);
    }
  }

  if (assigned > 0) {
    invalidateCachedHeroImages();
  }

  return { assigned, failed };
}

export async function fetchParkHeroCustomLookupKeys(): Promise<Set<string>> {
  const res = await fetch("/api/kamikaze/park-images");
  if (!res.ok) return new Set();
  const data = (await res.json()) as {
    images?: { countryCode: string; parkName: string; parkType: ParkType }[];
  };
  const keys = new Set<string>();
  for (const row of data.images ?? []) {
    keys.add(
      parkHeroLookupKey(String(row.countryCode), String(row.parkName), row.parkType)
    );
  }
  return keys;
}
