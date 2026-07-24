import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumnSchemaError } from "@/lib/supabase/pin-media-schema";
import type { MediaType } from "@/types/database";

const MEDIA_FIELDS = "media_type, media_url, photo_url, photo_urls, instagram_urls";
const PROFILE_JOIN =
  "profiles!inner(username, display_name, avatar_url, instagram_url)";
const PROFILE_JOIN_LEGACY = "profiles!inner(username, display_name, avatar_url)";

const PARK_PIN_SELECT_FULL = `id, park_name, country_code, note, ${MEDIA_FIELDS}, visit_dates, updated_at, ${PROFILE_JOIN}`;
const PARK_PIN_SELECT_FULL_LEGACY_PROFILE = `id, park_name, country_code, note, ${MEDIA_FIELDS}, visit_dates, updated_at, ${PROFILE_JOIN_LEGACY}`;
const PARK_PIN_SELECT_NO_VISIT_DATES = `id, park_name, country_code, note, ${MEDIA_FIELDS}, updated_at, ${PROFILE_JOIN}`;
const PARK_PIN_SELECT_NO_VISIT_DATES_LEGACY_PROFILE = `id, park_name, country_code, note, ${MEDIA_FIELDS}, updated_at, ${PROFILE_JOIN_LEGACY}`;
const PARK_PIN_SELECT_LEGACY = `id, park_name, country_code, note, media_type, media_url, updated_at, ${PROFILE_JOIN_LEGACY}`;
const PARK_PIN_SELECT_LEGACY_WITH_VISIT_DATES = `id, park_name, country_code, note, media_type, media_url, visit_dates, updated_at, ${PROFILE_JOIN_LEGACY}`;

export type ParkPinQueryRow = {
  id: string;
  park_name: string;
  country_code: string;
  note: string | null;
  photo_url?: string | null;
  instagram_urls?: string[] | null;
  media_type: MediaType | null;
  media_url: string | null;
  visit_dates?: string[] | null;
  updated_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    instagram_url?: string | null;
  } | null;
};

export type FetchParkPinRowsOptions = {
  /** Only rows with a photo or legacy media URL (gallery / hub previews). */
  mediaOnly?: boolean;
};

function isFetchTimeoutError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("timeout") || lower.includes("aborted");
}

async function runParkPinSelect(
  supabase: SupabaseClient,
  code: string,
  select: string,
  limit: number,
  options?: FetchParkPinRowsOptions
) {
  let query = supabase.from("visited_parks").select(select).eq("country_code", code);

  if (options?.mediaOnly) {
    query = query.or("photo_url.not.is.null,media_url.not.is.null");
  }

  return query.order("updated_at", { ascending: false }).limit(limit);
}

const PARK_PIN_SELECT_VARIANTS = [
  PARK_PIN_SELECT_FULL,
  PARK_PIN_SELECT_FULL_LEGACY_PROFILE,
  PARK_PIN_SELECT_NO_VISIT_DATES,
  PARK_PIN_SELECT_NO_VISIT_DATES_LEGACY_PROFILE,
  PARK_PIN_SELECT_LEGACY_WITH_VISIT_DATES,
  PARK_PIN_SELECT_LEGACY,
] as const;

async function selectParkPinRowsWithVariants(
  supabase: SupabaseClient,
  code: string,
  limit: number,
  options?: FetchParkPinRowsOptions
): Promise<ParkPinQueryRow[]> {
  let lastError: string | null = null;

  for (const select of PARK_PIN_SELECT_VARIANTS) {
    const result = await runParkPinSelect(supabase, code, select, limit, options);
    if (!result.error) {
      return (result.data as unknown as ParkPinQueryRow[] | null) ?? [];
    }
    lastError = result.error.message;
    if (isFetchTimeoutError(result.error.message)) {
      break;
    }
    if (!isMissingColumnSchemaError(result.error.message)) {
      break;
    }
  }

  if (
    options?.mediaOnly &&
    lastError &&
    isMissingColumnSchemaError(lastError) &&
    !isFetchTimeoutError(lastError)
  ) {
    return selectParkPinRowsWithVariants(supabase, code, limit, { mediaOnly: false });
  }

  if (lastError && !isFetchTimeoutError(lastError)) {
    console.error("fetchParkPinRows:", lastError);
  }

  return [];
}

export async function fetchParkPinRows(
  supabase: SupabaseClient,
  countryCode: string,
  limit = 40,
  options?: FetchParkPinRowsOptions
): Promise<ParkPinQueryRow[]> {
  const code = countryCode.toUpperCase();
  return selectParkPinRowsWithVariants(supabase, code, limit, options);
}
