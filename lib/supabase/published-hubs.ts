import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePublishedHubKeys } from "@/lib/cache/revalidate-published-hubs";
import {
  PUBLISHED_CITY_KEYS_TAG,
  PUBLISHED_CITY_SLUGS_TAG,
  PUBLISHED_PARK_KEYS_TAG,
  PUBLISHED_PARK_SLUGS_TAG,
} from "@/lib/cache/revalidate-published-hubs";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { buildCitySlug } from "@/lib/utils/city-slug";
import { buildParkSlug } from "@/lib/utils/park-slug";
import type { ParkType } from "@/types/database";

export type HubKind = "city" | "park";

export type PublishedHubRow = {
  hub_kind: HubKind;
  slug: string;
  country_code: string;
  place_name: string;
  country_name: string | null;
  park_type: ParkType | null;
  pinner_count: number;
};

export async function publishCityHubOnPin(
  supabase: SupabaseClient,
  row: { country_code: string; city_name: string; country_name: string }
): Promise<void> {
  await publishHub(supabase, {
    hubKind: "city",
    slug: buildCitySlug(row.city_name),
    countryCode: row.country_code,
    placeName: row.city_name,
    countryName: row.country_name,
  });
  revalidatePublishedHubKeys();
}

export async function publishParkHubOnPin(
  supabase: SupabaseClient,
  row: {
    country_code: string;
    park_name: string;
    country_name: string;
    park_type: ParkType;
  }
): Promise<void> {
  await publishHub(supabase, {
    hubKind: "park",
    slug: buildParkSlug(row.park_name),
    countryCode: row.country_code,
    placeName: row.park_name,
    countryName: row.country_name,
    parkType: row.park_type,
  });
  revalidatePublishedHubKeys();
}

async function publishHub(
  supabase: SupabaseClient,
  input: {
    hubKind: HubKind;
    slug: string;
    countryCode: string;
    placeName: string;
    countryName?: string;
    parkType?: ParkType;
  }
): Promise<void> {
  const { error } = await supabase.rpc("publish_hub", {
    p_hub_kind: input.hubKind,
    p_slug: input.slug,
    p_country_code: input.countryCode,
    p_place_name: input.placeName,
    p_country_name: input.countryName ?? null,
    p_park_type: input.parkType ?? null,
  });

  if (error) {
    console.error("publish_hub failed:", error.message);
  }
}

export async function isHubPublished(
  supabase: SupabaseClient,
  hubKind: HubKind,
  slug: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("published_hubs")
    .select("slug")
    .eq("hub_kind", hubKind)
    .eq("slug", slug.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("published_hubs lookup failed:", error.message);
    return false;
  }

  return Boolean(data);
}

export async function findPublishedHubBySlug(
  supabase: SupabaseClient,
  hubKind: HubKind,
  slug: string
): Promise<PublishedHubRow | null> {
  const { data, error } = await supabase
    .from("published_hubs")
    .select(
      "hub_kind, slug, country_code, place_name, country_name, park_type, pinner_count"
    )
    .eq("hub_kind", hubKind)
    .eq("slug", slug.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("published_hubs lookup failed:", error.message);
    return null;
  }

  if (!data) return null;

  return {
    ...(data as Omit<PublishedHubRow, "pinner_count">),
    pinner_count: (data as { pinner_count?: number }).pinner_count ?? 0,
  };
}

function buildPublishedCityKeys(rows: { country_code: string; place_name: string }[]): Set<string> {
  const keys = new Set<string>();
  for (const row of rows) {
    keys.add(`${row.country_code.toUpperCase()}:${row.place_name.trim().toLowerCase()}`);
  }
  return keys;
}

function buildPublishedParkKeys(rows: { country_code: string; place_name: string }[]): Set<string> {
  const keys = new Set<string>();
  for (const row of rows) {
    keys.add(`${row.country_code.toUpperCase()}:${row.place_name.trim().toLowerCase()}`);
  }
  return keys;
}

/** Cache stores arrays — `unstable_cache` JSON-serializes and strips Set methods. */
const getCachedPublishedCityKeys = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createPublicSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("published_hubs")
      .select("country_code, place_name")
      .eq("hub_kind", "city");

    if (error) {
      console.error("published_hubs city keys failed:", error.message);
      return [];
    }

    return [...buildPublishedCityKeys(data ?? [])];
  },
  ["published-city-keys"],
  { revalidate: false, tags: [PUBLISHED_CITY_KEYS_TAG] }
);

const getCachedPublishedParkKeys = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createPublicSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("published_hubs")
      .select("country_code, place_name")
      .eq("hub_kind", "park");

    if (error) {
      console.error("published_hubs park keys failed:", error.message);
      return [];
    }

    return [...buildPublishedParkKeys(data ?? [])];
  },
  ["published-park-keys"],
  { revalidate: false, tags: [PUBLISHED_PARK_KEYS_TAG] }
);

const getCachedPublishedCitySlugs = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createPublicSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("published_hubs")
      .select("slug")
      .eq("hub_kind", "city");

    if (error) {
      console.error("published_hubs list failed:", error.message);
      return [];
    }

    return (data ?? []).map((row) => row.slug);
  },
  ["published-city-slugs"],
  { revalidate: false, tags: [PUBLISHED_CITY_SLUGS_TAG] }
);

const getCachedPublishedParkSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createPublicSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("published_hubs")
      .select("slug")
      .eq("hub_kind", "park");

    if (error) {
      console.error("published_hubs list failed:", error.message);
      return [];
    }

    return (data ?? []).map((row) => row.slug);
  },
  ["published-park-slugs"],
  { revalidate: false, tags: [PUBLISHED_PARK_SLUGS_TAG] }
);

export async function loadPublishedHubSlugs(
  _supabase: SupabaseClient | null,
  hubKind: HubKind
): Promise<string[]> {
  if (hubKind === "city") return getCachedPublishedCitySlugs();
  return getCachedPublishedParkSlugs();
}

export async function loadPublishedCityKeys(_supabase: SupabaseClient | null): Promise<Set<string>> {
  return new Set(await getCachedPublishedCityKeys());
}

export async function loadPublishedParkKeys(_supabase: SupabaseClient | null): Promise<Set<string>> {
  return new Set(await getCachedPublishedParkKeys());
}
