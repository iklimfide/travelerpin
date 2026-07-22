import type { SupabaseClient } from "@supabase/supabase-js";
import {
  instagramUrlsInRow,
  isPinMediaSchemaError,
  isVisitDatesSchemaError,
  legacyMediaFromPinMediaFields,
  omitRowColumns,
  photoUrlsInRow,
  type PinMediaRowPayload,
} from "@/lib/supabase/pin-media-schema";

function pinMediaApiUnavailableError(detail: string): { message: string } {
  return {
    message: `City save blocked: Data API cannot use photo_url and instagram_urls yet. ${detail}`,
  };
}

function pinMediaDualSaveBlockedMessage(apiError: string): string {
  const lower = apiError.toLowerCase();
  if (lower.includes("schema cache") || lower.includes("could not find")) {
    return pinMediaApiUnavailableError(
      "Run migration 017_pin_photo_and_instagram_urls.sql (or 021_city_pin_media_columns.sql) in Supabase SQL Editor, then run NOTIFY pgrst, 'reload schema'; and wait 30 seconds."
    ).message;
  }

  return pinMediaApiUnavailableError(
    "Confirm migration 017 ran on the SAME Supabase project as your app, on table public.visited_cities, then reload the API schema."
  ).message;
}

export function formatVisitedCitySaveError(message: string | undefined | null): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Failed to save city";

  const lower = raw.toLowerCase();

  if (isVisitDatesSchemaError(raw)) {
    return "City save failed: run migration 017_pin_photo_and_instagram_urls.sql in Supabase, then reload the API schema.";
  }

  if (lower.includes("visit_dates") && lower.includes("visit_year_month_dates_are_valid")) {
    return "Invalid visit date format. Use month/year only, or clear visit dates and save again.";
  }

  if (isPinMediaSchemaError(raw)) {
    if (raw.includes("City save blocked:")) return raw;
    return pinMediaDualSaveBlockedMessage(raw);
  }

  return raw;
}

async function writeVisitedCityRow(
  supabase: SupabaseClient,
  mode: "update" | "insert",
  payload: PinMediaRowPayload,
  id?: string,
  userId?: string
) {
  if (mode === "update" && id && userId) {
    return supabase
      .from("visited_cities")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
  }

  return supabase.from("visited_cities").insert(payload).select().single();
}

async function persistVisitedCityRow(
  supabase: SupabaseClient,
  mode: "update" | "insert",
  fields: PinMediaRowPayload,
  id?: string,
  userId?: string
) {
  let payload: PinMediaRowPayload = { ...fields };
  let strippedVisitDates = false;
  let strippedPinMedia = false;
  let lastResult = await writeVisitedCityRow(supabase, mode, payload, id, userId);

  for (let attempt = 0; attempt < 3 && lastResult.error; attempt++) {
    const message = lastResult.error.message;

    if (!strippedVisitDates && isVisitDatesSchemaError(message)) {
      payload = omitRowColumns(payload, ["visit_dates"]);
      strippedVisitDates = true;
      lastResult = await writeVisitedCityRow(supabase, mode, payload, id, userId);
      continue;
    }

    if (!strippedPinMedia && isPinMediaSchemaError(message)) {
      const instagramUrls = instagramUrlsInRow(payload);
      const photoUrl = photoUrlInRow(payload);

      if (instagramUrls.length > 0 && photoUrl) {
        return { data: null, error: { message: pinMediaDualSaveBlockedMessage(message) } };
      }

      payload = legacyMediaFromPinMediaFields(payload);
      strippedPinMedia = true;
      lastResult = await writeVisitedCityRow(supabase, mode, payload, id, userId);
      continue;
    }

    break;
  }

  return lastResult;
}

export async function updateVisitedCityRow(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  fields: PinMediaRowPayload
) {
  return persistVisitedCityRow(supabase, "update", fields, id, userId);
}

export async function insertVisitedCityRow(supabase: SupabaseClient, fields: PinMediaRowPayload) {
  return persistVisitedCityRow(supabase, "insert", fields);
}
