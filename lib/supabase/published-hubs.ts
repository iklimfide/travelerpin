import type { SupabaseClient } from "@supabase/supabase-js";
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
    .select("hub_kind, slug, country_code, place_name, country_name, park_type")
    .eq("hub_kind", hubKind)
    .eq("slug", slug.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("published_hubs lookup failed:", error.message);
    return null;
  }

  return (data as PublishedHubRow | null) ?? null;
}

export async function loadPublishedHubSlugs(
  supabase: SupabaseClient | null,
  hubKind: HubKind
): Promise<string[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("published_hubs")
    .select("slug")
    .eq("hub_kind", hubKind);

  if (error) {
    console.error("published_hubs list failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.slug);
}

export async function loadPublishedCityKeys(supabase: SupabaseClient | null): Promise<Set<string>> {
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from("published_hubs")
    .select("country_code, place_name")
    .eq("hub_kind", "city");

  if (error) {
    console.error("published_hubs city keys failed:", error.message);
    return new Set();
  }

  const keys = new Set<string>();
  for (const row of data ?? []) {
    keys.add(`${row.country_code.toUpperCase()}:${row.place_name.trim().toLowerCase()}`);
  }

  return keys;
}

export async function loadPublishedParkKeys(supabase: SupabaseClient | null): Promise<Set<string>> {
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from("published_hubs")
    .select("country_code, place_name")
    .eq("hub_kind", "park");

  if (error) {
    console.error("published_hubs park keys failed:", error.message);
    return new Set();
  }

  const keys = new Set<string>();
  for (const row of data ?? []) {
    keys.add(`${row.country_code.toUpperCase()}:${row.place_name.trim().toLowerCase()}`);
  }

  return keys;
}
