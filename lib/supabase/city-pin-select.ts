import type { SupabaseClient } from "@supabase/supabase-js";
import type { CityHub } from "@/lib/data/city-hubs";
import { isMissingColumnSchemaError } from "@/lib/supabase/pin-media-schema";
import type { MediaType } from "@/types/database";

const MEDIA_FIELDS = "media_type, media_url, media_preview_url, photo_url, photo_urls, instagram_urls";
const PROFILE_JOIN =
  "profiles!inner(username, display_name, avatar_url, instagram_url)";
const PROFILE_JOIN_LEGACY = "profiles!inner(username, display_name, avatar_url)";

const CITY_PIN_SELECT_FULL = `id, city_name, note, ${MEDIA_FIELDS}, visit_dates, updated_at, ${PROFILE_JOIN}`;
const CITY_PIN_SELECT_FULL_LEGACY_PROFILE = `id, city_name, note, ${MEDIA_FIELDS}, visit_dates, updated_at, ${PROFILE_JOIN_LEGACY}`;
const CITY_PIN_SELECT_NO_VISIT_DATES = `id, city_name, note, ${MEDIA_FIELDS}, updated_at, ${PROFILE_JOIN}`;
const CITY_PIN_SELECT_NO_VISIT_DATES_LEGACY_PROFILE = `id, city_name, note, ${MEDIA_FIELDS}, updated_at, ${PROFILE_JOIN_LEGACY}`;
const CITY_PIN_SELECT_LEGACY_WITH_VISIT_DATES = `id, city_name, note, media_type, media_url, media_preview_url, visit_dates, updated_at, ${PROFILE_JOIN_LEGACY}`;
const CITY_PIN_SELECT_LEGACY = `id, city_name, note, media_type, media_url, media_preview_url, updated_at, ${PROFILE_JOIN_LEGACY}`;
const CITY_PIN_SELECT_HUB_FULL = `id, note, ${MEDIA_FIELDS}, visit_dates, updated_at, ${PROFILE_JOIN}`;
const CITY_PIN_SELECT_HUB_FULL_LEGACY_PROFILE = `id, note, ${MEDIA_FIELDS}, visit_dates, updated_at, ${PROFILE_JOIN_LEGACY}`;
const CITY_PIN_SELECT_HUB_NO_VISIT_DATES = `id, note, ${MEDIA_FIELDS}, updated_at, ${PROFILE_JOIN}`;
const CITY_PIN_SELECT_HUB_NO_VISIT_DATES_LEGACY_PROFILE = `id, note, ${MEDIA_FIELDS}, updated_at, ${PROFILE_JOIN_LEGACY}`;
const CITY_PIN_SELECT_HUB_LEGACY_WITH_VISIT_DATES = `id, note, media_type, media_url, media_preview_url, visit_dates, updated_at, ${PROFILE_JOIN_LEGACY}`;
const CITY_PIN_SELECT_HUB_LEGACY = `id, note, media_type, media_url, media_preview_url, updated_at, ${PROFILE_JOIN_LEGACY}`;

export type CityPinQueryRow = {
  id: string;
  city_name?: string;
  note: string | null;
  photo_url?: string | null;
  instagram_urls?: string[] | null;
  media_type: MediaType | null;
  media_url: string | null;
  media_preview_url: string | null;
  visit_dates?: string[] | null;
  updated_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    instagram_url?: string | null;
  } | null;
};

async function runCountryCityPinSelect(
  supabase: SupabaseClient,
  code: string,
  select: string,
  limit: number
) {
  return supabase
    .from("visited_cities")
    .select(select)
    .eq("country_code", code)
    .order("updated_at", { ascending: false })
    .limit(limit);
}

async function runHubCityPinSelect(
  supabase: SupabaseClient,
  code: string,
  cityName: string,
  select: string,
  limit: number
) {
  return supabase
    .from("visited_cities")
    .select(select)
    .eq("country_code", code)
    .ilike("city_name", cityName)
    .order("updated_at", { ascending: false })
    .limit(limit);
}

async function selectWithVariants<T>(
  variants: readonly string[],
  run: (select: string) => ReturnType<typeof runCountryCityPinSelect>
): Promise<T[]> {
  let lastError: string | null = null;

  for (const select of variants) {
    const result = await run(select);
    if (!result.error) {
      return (result.data as T[] | null) ?? [];
    }
    lastError = result.error.message;
    if (isFetchTimeoutError(result.error.message)) {
      break;
    }
    if (!isMissingColumnSchemaError(result.error.message)) {
      break;
    }
  }

  if (lastError && !isFetchTimeoutError(lastError)) {
    console.error("city-pin-select:", lastError);
  }

  return [];
}

function isFetchTimeoutError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("timeout") || lower.includes("aborted");
}

export async function fetchCityPinRowsByCountry(
  supabase: SupabaseClient,
  countryCode: string,
  limit = 30
): Promise<CityPinQueryRow[]> {
  const code = countryCode.toUpperCase();

  return selectWithVariants<CityPinQueryRow>(
    [
      CITY_PIN_SELECT_FULL,
      CITY_PIN_SELECT_FULL_LEGACY_PROFILE,
      CITY_PIN_SELECT_NO_VISIT_DATES,
      CITY_PIN_SELECT_NO_VISIT_DATES_LEGACY_PROFILE,
      CITY_PIN_SELECT_LEGACY_WITH_VISIT_DATES,
      CITY_PIN_SELECT_LEGACY,
    ],
    (select) => runCountryCityPinSelect(supabase, code, select, limit)
  );
}

export async function fetchCityPinRowsForHub(
  supabase: SupabaseClient,
  hub: CityHub,
  limit = 40
): Promise<CityPinQueryRow[]> {
  const code = hub.countryCode.toUpperCase();
  const cityName = hub.name.trim();

  return selectWithVariants<CityPinQueryRow>(
    [
      CITY_PIN_SELECT_HUB_FULL,
      CITY_PIN_SELECT_HUB_FULL_LEGACY_PROFILE,
      CITY_PIN_SELECT_HUB_NO_VISIT_DATES,
      CITY_PIN_SELECT_HUB_NO_VISIT_DATES_LEGACY_PROFILE,
      CITY_PIN_SELECT_HUB_LEGACY_WITH_VISIT_DATES,
      CITY_PIN_SELECT_HUB_LEGACY,
    ],
    (select) => runHubCityPinSelect(supabase, code, cityName, select, limit)
  );
}
