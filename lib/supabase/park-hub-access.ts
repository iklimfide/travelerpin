import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureParkHubFromTouristPark,
  getParkHubBySlug,
  hubFromParkFields,
  isPopularParkHub,
  listPopularParkHubSlugs,
  type ParkHub,
} from "@/lib/data/park-hubs";
import { findTouristParksBySlug } from "@/lib/data/tourist-park-search";
import {
  findPublishedHubBySlug,
  isHubPublished,
  loadPublishedHubSlugs,
  loadPublishedParkKeys,
  publishParkHubOnPin,
} from "@/lib/supabase/published-hubs";
import { countParkPinners } from "@/lib/supabase/park-visitor-state";
import { buildParkSlug } from "@/lib/utils/park-slug";
import type { ParkType } from "@/types/database";

export type PinnedParkRow = {
  park_name: string;
  park_type: ParkType;
  country_code: string;
  country_name: string;
  latitude: number | null;
  longitude: number | null;
};

export function pinnedParkKey(countryCode: string, parkName: string): string {
  return `${countryCode.toUpperCase()}:${parkName.trim().toLowerCase()}`;
}

export function touristParkIsPubliclyLinked(
  park: { name: string; countryCode: string },
  publishedParkKeys: Set<string>
): boolean {
  const slug = buildParkSlug(park.name);
  return isPopularParkHub(slug) || publishedParkKeys.has(pinnedParkKey(park.countryCode, park.name));
}

export async function parkHubIsPublic(
  supabase: SupabaseClient | null,
  hub: ParkHub
): Promise<boolean> {
  if (isPopularParkHub(hub.slug)) return true;
  if (!supabase) return false;
  if (await isHubPublished(supabase, "park", hub.slug)) return true;

  const pinCount = await countParkPinners(supabase, hub);
  if (pinCount > 0) {
    await publishParkHubOnPin(supabase, {
      country_code: hub.countryCode,
      park_name: hub.name,
      country_name: hub.countryName,
      park_type: hub.parkType,
    });
    return true;
  }

  return false;
}

async function findPinnedParkRowBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<PinnedParkRow | null> {
  const { data } = await supabase
    .from("visited_parks")
    .select("park_name, park_type, country_code, country_name, latitude, longitude");

  for (const row of data ?? []) {
    if (!row.park_name || !row.country_code) continue;
    if (buildParkSlug(row.park_name) !== slug) continue;
    return row as PinnedParkRow;
  }

  return null;
}

function hubFromPublishedParkRow(row: {
  place_name: string;
  park_type: ParkType | null;
  country_code: string;
  country_name: string | null;
}): ParkHub {
  return hubFromParkFields({
    parkName: row.place_name,
    parkType: row.park_type ?? "national_park",
    countryCode: row.country_code,
    countryName: row.country_name ?? row.country_code,
    latitude: 0,
    longitude: 0,
  });
}

export async function loadParkHubBySlug(
  supabase: SupabaseClient | null,
  slug: string
): Promise<ParkHub | null> {
  const popularHub = getParkHubBySlug(slug);
  if (popularHub && isPopularParkHub(slug)) return popularHub;

  if (supabase) {
    const publishedRow = await findPublishedHubBySlug(supabase, "park", slug);
    if (publishedRow) {
      return hubFromPublishedParkRow(publishedRow);
    }
  }

  const touristMatches = findTouristParksBySlug(slug);
  const publishedParkKeys = await loadPublishedParkKeys(supabase);

  if (touristMatches.length > 0) {
    const publishedMatch = touristMatches.find((park) =>
      publishedParkKeys.has(pinnedParkKey(park.countryCode, park.name))
    );
    const popularMatch = touristMatches.find((park) => isPopularParkHub(buildParkSlug(park.name)));
    const pick = publishedMatch ?? popularMatch ?? touristMatches[0];
    return ensureParkHubFromTouristPark(pick);
  }

  if (!supabase) return null;

  const pinnedRow = await findPinnedParkRowBySlug(supabase, slug);
  if (!pinnedRow) return null;

  return hubFromParkFields({
    parkName: pinnedRow.park_name,
    parkType: pinnedRow.park_type,
    countryCode: pinnedRow.country_code,
    countryName: pinnedRow.country_name,
    latitude: pinnedRow.latitude ?? 0,
    longitude: pinnedRow.longitude ?? 0,
  });
}

export async function loadPublicParkHubBySlug(
  supabase: SupabaseClient | null,
  slug: string
): Promise<ParkHub | null> {
  const hub = await loadParkHubBySlug(supabase, slug);
  if (!hub) return null;
  if (!(await parkHubIsPublic(supabase, hub))) return null;
  return hub;
}

export async function listPublicParkHubSlugs(supabase: SupabaseClient | null): Promise<string[]> {
  const slugs = new Set(listPopularParkHubSlugs());

  for (const slug of await loadPublishedHubSlugs(supabase, "park")) {
    slugs.add(slug);
  }

  return [...slugs].sort((a, b) => a.localeCompare(b));
}

export { loadPublishedParkKeys };
