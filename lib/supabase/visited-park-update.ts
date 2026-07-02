import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaType } from "@/types/database";

type VisitedParkRow = Record<string, unknown>;

function isVisitDatesUnavailable(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("visit_dates") &&
    (lower.includes("does not exist") ||
      lower.includes("schema cache") ||
      lower.includes("could not find"))
  );
}

function isPinMediaColumnsUnavailable(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    (lower.includes("photo_url") || lower.includes("instagram_urls")) &&
    (lower.includes("does not exist") ||
      lower.includes("schema cache") ||
      lower.includes("could not find"))
  );
}

function omitColumns(fields: VisitedParkRow, keys: string[]): VisitedParkRow {
  const next = { ...fields };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}

function instagramUrlsInPayload(fields: VisitedParkRow): string[] {
  if (!Array.isArray(fields.instagram_urls)) return [];
  return fields.instagram_urls.filter(
    (url): url is string => typeof url === "string" && Boolean(url.trim())
  );
}

function photoUrlInPayload(fields: VisitedParkRow): string | null {
  if (typeof fields.photo_url === "string" && fields.photo_url.trim()) {
    return fields.photo_url.trim();
  }
  if (fields.media_type === "photo" && typeof fields.media_url === "string" && fields.media_url.trim()) {
    return fields.media_url.trim();
  }
  return null;
}

function pinMediaApiUnavailableError(detail: string): { message: string } {
  return {
    message: `Park save blocked: Data API cannot use photo_url and instagram_urls yet. ${detail}`,
  };
}

function pinMediaDualSaveBlockedMessage(apiError: string): string {
  const lower = apiError.toLowerCase();
  if (lower.includes("schema cache") || lower.includes("could not find")) {
    return pinMediaApiUnavailableError(
      "PostgREST schema cache is stale. In Supabase SQL Editor run: NOTIFY pgrst, 'reload schema'; wait 30 seconds, then save again."
    ).message;
  }

  return pinMediaApiUnavailableError(
    "Confirm migration 019 ran on the SAME project as your app (.env.local NEXT_PUBLIC_SUPABASE_URL), on table public.visited_parks, then run: NOTIFY pgrst, 'reload schema';"
  ).message;
}

/** Map photo_url + instagram_urls into legacy media_type/media_url when new columns are missing. */
function legacyMediaFromPinMedia(fields: VisitedParkRow): VisitedParkRow {
  const photoUrl = photoUrlInPayload(fields);
  const instagramUrls = instagramUrlsInPayload(fields);

  let media_type = (fields.media_type as MediaType | null | undefined) ?? null;
  let media_url =
    typeof fields.media_url === "string" && fields.media_url.trim()
      ? fields.media_url.trim()
      : null;

  if (photoUrl) {
    media_type = "photo";
    media_url = photoUrl;
  } else if (instagramUrls.length > 0) {
    media_type = "instagram";
    media_url = instagramUrls[0];
  } else if (!media_type) {
    media_url = null;
  }

  const withoutNewColumns = omitColumns(fields, ["photo_url", "instagram_urls"]);
  return { ...withoutNewColumns, media_type, media_url };
}

export function formatVisitedParkSaveError(message: string | undefined | null): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Failed to save park";

  const lower = raw.toLowerCase();

  if (isVisitDatesUnavailable(raw)) {
    return "Park save failed: run migration 019_park_media_columns_fix.sql in Supabase, then reload the API schema (Settings → API → Reload schema).";
  }

  if (lower.includes("set_updated_at")) {
    return "Park save failed: run migration 016_park_save_fix.sql in Supabase SQL Editor, then try again.";
  }

  if (lower.includes("visit_dates") && lower.includes("visit_year_month_dates_are_valid")) {
    return "Invalid visit date format. Use month/year only, or clear visit dates and save again.";
  }

  if (isPinMediaColumnsUnavailable(raw)) {
    if (raw.includes("Park save blocked:")) return raw;
    return pinMediaDualSaveBlockedMessage(raw);
  }

  return raw;
}

async function writeVisitedParkRow(
  supabase: SupabaseClient,
  mode: "update" | "insert",
  payload: VisitedParkRow,
  id?: string,
  userId?: string
) {
  if (mode === "update" && id && userId) {
    return supabase
      .from("visited_parks")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
  }

  return supabase.from("visited_parks").insert(payload).select().single();
}

async function persistVisitedParkRow(
  supabase: SupabaseClient,
  mode: "update" | "insert",
  fields: VisitedParkRow,
  id?: string,
  userId?: string
) {
  let payload: VisitedParkRow = { ...fields };
  let strippedVisitDates = false;
  let strippedPinMedia = false;
  let lastResult = await writeVisitedParkRow(supabase, mode, payload, id, userId);

  for (let attempt = 0; attempt < 3 && lastResult.error; attempt++) {
    const message = lastResult.error.message;

    if (!strippedVisitDates && isVisitDatesUnavailable(message)) {
      payload = omitColumns(payload, ["visit_dates"]);
      strippedVisitDates = true;
      lastResult = await writeVisitedParkRow(supabase, mode, payload, id, userId);
      continue;
    }

    if (!strippedPinMedia && isPinMediaColumnsUnavailable(message)) {
      const instagramUrls = instagramUrlsInPayload(payload);
      const photoUrl = photoUrlInPayload(payload);

      if (instagramUrls.length > 0 && photoUrl) {
        return { data: null, error: { message: pinMediaDualSaveBlockedMessage(message) } };
      }

      payload = legacyMediaFromPinMedia(payload);
      strippedPinMedia = true;
      lastResult = await writeVisitedParkRow(supabase, mode, payload, id, userId);
      continue;
    }

    break;
  }

  return lastResult;
}

/** Writes park rows, stripping only columns missing from PostgREST schema when needed. */
export async function updateVisitedParkRow(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  fields: VisitedParkRow
) {
  return persistVisitedParkRow(supabase, "update", fields, id, userId);
}

export async function insertVisitedParkRow(supabase: SupabaseClient, fields: VisitedParkRow) {
  return persistVisitedParkRow(supabase, "insert", fields);
}
