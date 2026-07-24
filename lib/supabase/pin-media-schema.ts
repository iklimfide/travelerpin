import type { MediaType } from "@/types/database";

export type PinMediaRowPayload = Record<string, unknown>;

export function isMissingColumnSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("schema cache") ||
    lower.includes("could not find")
  );
}

export function isVisitDatesSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("visit_dates") && isMissingColumnSchemaError(message);
}

export function isPinMediaSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    (lower.includes("photo_url") ||
      lower.includes("photo_urls") ||
      lower.includes("instagram_urls")) &&
    isMissingColumnSchemaError(message)
  );
}

export function omitRowColumns<T extends PinMediaRowPayload>(
  fields: T,
  keys: string[]
): T {
  const next = { ...fields };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}

export function instagramUrlsInRow(fields: PinMediaRowPayload): string[] {
  if (!Array.isArray(fields.instagram_urls)) return [];
  return fields.instagram_urls.filter(
    (url): url is string => typeof url === "string" && Boolean(url.trim())
  );
}

export function photoUrlsInRow(fields: PinMediaRowPayload): string[] {
  if (Array.isArray(fields.photo_urls)) {
    return fields.photo_urls.filter(
      (url): url is string => typeof url === "string" && Boolean(url.trim())
    );
  }
  const single = photoUrlInRow(fields);
  return single ? [single] : [];
}

export function photoUrlInRow(fields: PinMediaRowPayload): string | null {
  if (typeof fields.photo_url === "string" && fields.photo_url.trim()) {
    return fields.photo_url.trim();
  }
  if (
    fields.media_type === "photo" &&
    typeof fields.media_url === "string" &&
    fields.media_url.trim()
  ) {
    return fields.media_url.trim();
  }
  return null;
}

/** Map photo_url + instagram_urls into legacy media_type/media_url when new columns are missing. */
export function legacyMediaFromPinMediaFields(fields: PinMediaRowPayload): PinMediaRowPayload {
  const photoUrl = photoUrlInRow(fields);
  const instagramUrls = instagramUrlsInRow(fields);

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

  const withoutNewColumns = omitRowColumns(fields, ["photo_url", "photo_urls", "instagram_urls"]);
  return { ...withoutNewColumns, media_type, media_url };
}
