/** Profiles allowed as Instagram import targets from YP (master-only). */
export const YP_INSTAGRAM_IMPORT_USERNAMES = [
  "guvencgiller",
  "arif",
  "nazli",
] as const;

export type YpInstagramImportUsername = (typeof YP_INSTAGRAM_IMPORT_USERNAMES)[number];

export const YP_INSTAGRAM_IMPORT_DEFAULT_USERNAME: YpInstagramImportUsername = "guvencgiller";

export function isYpInstagramImportUsername(
  value: string
): value is YpInstagramImportUsername {
  const normalized = value.trim().toLowerCase();
  return (YP_INSTAGRAM_IMPORT_USERNAMES as readonly string[]).includes(normalized);
}

export function normalizeYpInstagramImportUsername(value: string): YpInstagramImportUsername | null {
  const normalized = value.trim().toLowerCase();
  return isYpInstagramImportUsername(normalized) ? normalized : null;
}
