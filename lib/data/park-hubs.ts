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
  latitude: number | null;
  longitude: number | null;
};

const bySlug = new Map<string, ParkHub>();
const popularSlugs = new Set<string>();

function registerPark(input: {
  name: string;
  searchNames?: string[];
  parkType: ParkType;
  countryCode: string;
  countryName: string;
  latitude?: number | null;
  longitude?: number | null;
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
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  });
}

for (const park of POPULAR_PARKS) {
  const slug = buildParkSlug(park.parkName, park.countryCode);
  popularSlugs.add(slug);
  registerPark({
    name: park.parkName,
    searchNames: park.label !== park.parkName ? [park.label] : [],
    parkType: park.parkType,
    countryCode: park.countryCode,
    countryName: park.countryName,
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

  return buildParkSlug(parkName, countryCode);
}

export function listParkHubSlugs(): string[] {
  return [...popularSlugs].sort((a, b) => a.localeCompare(b));
}

export function listPopularParkHubSlugs(): string[] {
  return listParkHubSlugs();
}

export function isPopularParkHub(slug: string): boolean {
  return popularSlugs.has(slug.toLowerCase());
}

export function hubFromParkFields(fields: {
  parkName: string;
  parkType: ParkType;
  countryCode: string;
  countryName: string;
  latitude?: number | null;
  longitude?: number | null;
}): ParkHub {
  return ensureParkHubFromTouristPark({
    name: fields.parkName,
    parkType: fields.parkType,
    countryCode: fields.countryCode,
    countryName: fields.countryName,
    latitude: fields.latitude,
    longitude: fields.longitude,
  });
}

export function ensureParkHubFromTouristPark(park: {
  name: string;
  parkType: ParkType;
  countryCode: string;
  countryName: string;
  latitude?: number | null;
  longitude?: number | null;
}): ParkHub {
  const slug = buildParkSlug(park.name, park.countryCode);
  const existing = bySlug.get(slug);
  if (existing) return existing;

  registerPark(park);
  return bySlug.get(slug)!;
}
