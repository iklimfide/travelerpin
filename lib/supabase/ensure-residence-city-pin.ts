import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateCityHubForPin } from "@/lib/cache/revalidate-city-hub";
import { ensureVisitedCountry } from "@/lib/supabase/ensure-visited-country";
import { notifyFollowersAfterCityPin } from "@/lib/supabase/notify-pin-followers";
import { publishCityHubOnPin } from "@/lib/supabase/published-hubs";
import {
  formatVisitedCitySaveError,
  insertVisitedCityRow,
} from "@/lib/supabase/visited-city-update";
import type { ResidenceCityPinInput } from "@/lib/utils/residence-city";
import {
  normalizeCityKey,
  resolveResidenceCityPinInput,
} from "@/lib/utils/residence-city";

export type EnsureResidenceCityPinResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

/**
 * Pin the user's residence city (and its country) if not already on the map.
 * Idempotent — safe to call on profile load for backfill.
 */
export async function ensureResidenceCityPin(
  supabase: SupabaseClient,
  userId: string,
  input: ResidenceCityPinInput,
  options?: { notify?: boolean }
): Promise<EnsureResidenceCityPinResult> {
  const code = input.country_code.toUpperCase();
  const notify = options?.notify === true;

  const countryResult = await ensureVisitedCountry(
    supabase,
    userId,
    code,
    input.country_name
  );
  if (!countryResult.ok) return countryResult;

  const { data: existingCities } = await supabase
    .from("visited_cities")
    .select("id, city_name")
    .eq("user_id", userId)
    .eq("country_code", code);

  const residenceKey = normalizeCityKey(input.city_name);
  const existingCity = (existingCities ?? []).find(
    (city) => normalizeCityKey(city.city_name) === residenceKey
  );

  if (existingCity) return { ok: true, created: false };

  const { data: city, error } = await insertVisitedCityRow(supabase, {
    user_id: userId,
    city_name: input.city_name,
    country_code: code,
    country_name: input.country_name,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    note: null,
    photo_url: null,
    instagram_urls: [],
    media_type: null,
    media_url: null,
    media_preview_url: null,
    visit_dates: [],
  });

  if (error) {
    return { ok: false, error: formatVisitedCitySaveError(error.message) };
  }

  revalidateCityHubForPin(city.country_code, city.city_name);
  await publishCityHubOnPin(supabase, city);
  if (notify) {
    await notifyFollowersAfterCityPin(supabase, userId, city);
  }

  return { ok: true, created: true };
}

/** Resolve residence text and pin it when possible. */
export async function ensureResidenceCityPinFromLabel(
  supabase: SupabaseClient,
  userId: string,
  residence: string | null | undefined,
  options?: { notify?: boolean }
): Promise<EnsureResidenceCityPinResult> {
  const input = resolveResidenceCityPinInput(residence);
  if (!input) return { ok: true, created: false };
  return ensureResidenceCityPin(supabase, userId, input, options);
}
