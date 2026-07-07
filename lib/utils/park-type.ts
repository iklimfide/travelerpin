import type { ParkType } from "@/types/database";
import { parkMessages } from "@/lib/i18n/client-messages";

export function isThemeParkType(type: ParkType): boolean {
  return type === "theme_park";
}

export function isNaturaParkType(type: ParkType): boolean {
  return type === "national_park" || type === "botanical_garden";
}

export function matchesParkTypeFilter(parkType: ParkType, filter?: ParkType): boolean {
  if (filter == null) return true;
  if (filter === "theme_park") return isThemeParkType(parkType);
  if (filter === "national_park") return isNaturaParkType(parkType);
  return parkType === filter;
}

export function parkTypeLabel(type: ParkType): string {
  switch (type) {
    case "national_park":
    case "botanical_garden":
      return parkMessages.nationalPark;
    case "theme_park":
      return parkMessages.themePark;
  }
}
