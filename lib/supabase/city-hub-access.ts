import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findCityHubSlug,
  getCityHubBySlug,
  getCityHubContext,
  getCityHubParks,
  getCityHubTouristCity,
  hubFromCityFields,
  isFeaturedCityHub,
  listFeaturedCityHubSlugs,
  ensureCityHubFromTouristCity,
  type CityHub,
  type CityHubContext,
} from "@/lib/data/city-hubs";
import { getCountryHubByCode } from "@/lib/data/country-hubs";
import { findTouristCitiesBySlug } from "@/lib/data/tourist-cities";
import {
  findPublishedHubBySlug,
  isHubPublished,
  loadPublishedCityKeys,
  loadPublishedHubSlugs,
  publishCityHubOnPin,
} from "@/lib/supabase/published-hubs";
import { countCityPinners } from "@/lib/supabase/city-travelers";
import { buildCitySlug } from "@/lib/utils/city-slug";

export type PinnedCityRow = {
  city_name: string;
  country_code: string;
  country_name: string;
};

export function pinnedCityKey(countryCode: string, cityName: string): string {
  return `${countryCode.toUpperCase()}:${cityName.trim().toLowerCase()}`;
}

function asKeySet(keys: Set<string> | Iterable<string> | null | undefined): Set<string> {
  return keys instanceof Set ? keys : new Set(keys ?? []);
}

export function cityIsPubliclyLinked(
  countryCode: string,
  cityName: string,
  publishedCityKeys: Set<string> | Iterable<string> | null | undefined
): boolean {
  const catalogSlug = findCityHubSlug(countryCode, cityName);
  if (catalogSlug && isFeaturedCityHub(catalogSlug)) return true;
  return asKeySet(publishedCityKeys).has(pinnedCityKey(countryCode, cityName));
}

export function publicCityHubSlug(
  countryCode: string,
  cityName: string,
  publishedCityKeys: Set<string> | Iterable<string> | null | undefined
): string | null {
  if (!cityIsPubliclyLinked(countryCode, cityName, publishedCityKeys)) return null;
  return findCityHubSlug(countryCode, cityName) ?? buildCitySlug(cityName);
}

export async function cityHubIsPublic(
  supabase: SupabaseClient | null,
  hub: CityHub
): Promise<boolean> {
  if (isFeaturedCityHub(hub.slug)) return true;
  if (!supabase) return false;
  if (await isHubPublished(supabase, "city", hub.slug)) return true;

  const pinCount = await countCityPinners(supabase, hub);
  if (pinCount > 0) {
    await publishCityHubOnPin(supabase, {
      country_code: hub.countryCode,
      city_name: hub.name,
      country_name: hub.countryName,
    });
    return true;
  }

  return false;
}

async function findPinnedCityRowBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<PinnedCityRow | null> {
  const { data } = await supabase
    .from("visited_cities")
    .select("city_name, country_code, country_name");

  for (const row of data ?? []) {
    if (!row.city_name || !row.country_code) continue;
    if (buildCitySlug(row.city_name) !== slug) continue;
    return row as PinnedCityRow;
  }

  return null;
}

export async function loadCityHubBySlug(
  supabase: SupabaseClient | null,
  slug: string
): Promise<CityHub | null> {
  const featuredHub = getCityHubBySlug(slug);
  if (featuredHub && isFeaturedCityHub(slug)) return featuredHub;

  if (supabase) {
    const publishedRow = await findPublishedHubBySlug(supabase, "city", slug);
    if (publishedRow) {
      return hubFromCityFields({
        cityName: publishedRow.place_name,
        countryCode: publishedRow.country_code,
        countryName: publishedRow.country_name ?? publishedRow.country_code,
      });
    }
  }

  const touristMatches = findTouristCitiesBySlug(slug);
  const publishedCityKeys = await loadPublishedCityKeys(supabase);

  if (touristMatches.length > 0) {
    const keys = asKeySet(publishedCityKeys);
    const publishedMatch = touristMatches.find((city) =>
      keys.has(pinnedCityKey(city.countryCode, city.name))
    );
    const featuredMatch = touristMatches.find((city) => {
      const catalogSlug = findCityHubSlug(city.countryCode, city.name);
      return catalogSlug ? isFeaturedCityHub(catalogSlug) : false;
    });
    const pick = publishedMatch ?? featuredMatch ?? touristMatches[0];
    return ensureCityHubFromTouristCity(pick);
  }

  if (!supabase) return null;

  const pinnedRow = await findPinnedCityRowBySlug(supabase, slug);
  if (!pinnedRow) return null;

  return hubFromCityFields({
    cityName: pinnedRow.city_name,
    countryCode: pinnedRow.country_code,
    countryName: pinnedRow.country_name,
  });
}

export async function loadPublicCityHubBySlug(
  supabase: SupabaseClient | null,
  slug: string
): Promise<CityHub | null> {
  const hub = await loadCityHubBySlug(supabase, slug);
  if (!hub) return null;
  if (!(await cityHubIsPublic(supabase, hub))) return null;
  return hub;
}

export async function loadPublicCityHubContext(
  supabase: SupabaseClient | null,
  slug: string
): Promise<CityHubContext | null> {
  const featuredContext = getCityHubContext(slug);
  if (featuredContext && isFeaturedCityHub(slug)) {
    return featuredContext;
  }

  const hub = await loadPublicCityHubBySlug(supabase, slug);
  if (!hub) return null;

  return {
    hub,
    touristCity: getCityHubTouristCity(hub),
    countryHub: getCountryHubByCode(hub.countryCode),
    parks: getCityHubParks(hub),
  };
}

export async function listPublicCityHubSlugs(supabase: SupabaseClient | null): Promise<string[]> {
  const slugs = new Set(listFeaturedCityHubSlugs());

  for (const slug of await loadPublishedHubSlugs(supabase, "city")) {
    slugs.add(slug);
  }

  return [...slugs].sort((a, b) => a.localeCompare(b));
}

export { loadPublishedCityKeys };
