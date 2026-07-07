import type { ParkHub } from "@/lib/data/park-hubs";
import type { ParkType } from "@/types/database";
import { isNaturaParkType, isThemeParkType } from "@/lib/utils/park-type";

export const PARK_CATEGORY_SLUGS = ["theme-parks", "national-parks"] as const;

export type ParkCategorySlug = (typeof PARK_CATEGORY_SLUGS)[number];

export function parseParkCategorySlug(value: string): ParkCategorySlug | null {
  const normalized = value.toLowerCase();
  return PARK_CATEGORY_SLUGS.includes(normalized as ParkCategorySlug)
    ? (normalized as ParkCategorySlug)
    : null;
}

export function parkCategorySlugForParkType(type: ParkType): ParkCategorySlug {
  return isNaturaParkType(type) ? "national-parks" : "theme-parks";
}

export function parkHubMatchesCategory(hub: ParkHub, category: ParkCategorySlug): boolean {
  if (category === "national-parks") return isNaturaParkType(hub.parkType);
  return isThemeParkType(hub.parkType);
}
