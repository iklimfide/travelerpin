import { POPULAR_PARKS } from "@/lib/data/popular-parks";
import type { ParkType } from "@/lib/data/tourist-park-search";
import { getCountryHubByCode } from "@/lib/data/country-hubs";
import { buildParkSlug } from "@/lib/utils/park-slug";
import { parkPinMatchesHub, uniqueParkSearchNames } from "@/lib/utils/park-hub-match";

export type ParkHub = {
  slug: string;
  name: string;
  searchNames: string[];
  parkType: ParkType;
  countryCode: string;
  countrySlug: string;
  countryName: string;
  latitude: number;
  longitude: number;
};

const bySlug = new Map<string, ParkHub>();

function registerPark(input: {
  name: string;
  searchNames?: string[];
  parkType: ParkType;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
}) {
  const slug = buildParkSlug(input.name, input.countryCode);
  if (bySlug.has(slug)) return;

  const countryHub = getCountryHubByCode(input.countryCode);

  bySlug.set(slug, {
    slug,
    name: input.name,
    searchNames: uniqueParkSearchNames(input.name, ...(input.searchNames ?? [])),
    parkType: input.parkType,
    countryCode: input.countryCode.toUpperCase(),
    countrySlug: countryHub?.slug ?? input.countryCode.toLowerCase(),
    countryName: countryHub?.name ?? input.countryName,
    latitude: input.latitude,
    longitude: input.longitude,
  });
}

for (const park of POPULAR_PARKS) {
  registerPark({
    name: park.parkName,
    searchNames: park.label !== park.parkName ? [park.label] : [],
    parkType: park.parkType,
    countryCode: park.countryCode,
    countryName: park.countryName,
    latitude: park.latitude,
    longitude: park.longitude,
  });
}

export function getParkHubBySlug(slug: string): ParkHub | null {
  return bySlug.get(slug.toLowerCase()) ?? null;
}

export function findParkHubSlug(parkName: string, countryCode: string): string | null {
  const code = countryCode.toUpperCase();

  for (const hub of bySlug.values()) {
    if (parkPinMatchesHub(parkName, code, hub)) {
      return hub.slug;
    }
  }

  return null;
}

export function listParkHubSlugs(): string[] {
  return [...bySlug.keys()].sort((a, b) => a.localeCompare(b));
}

export function ensureParkHubFromTouristPark(park: {
  name: string;
  parkType: ParkType;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
}): ParkHub {
  const slug = buildParkSlug(park.name, park.countryCode);
  const existing = bySlug.get(slug);
  if (existing) return existing;

  registerPark(park);
  return bySlug.get(slug)!;
}
