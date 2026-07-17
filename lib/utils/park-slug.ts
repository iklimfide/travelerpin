import { buildAsciiSlug } from "@/lib/utils/ascii-slug";

const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

/** Park URL slug from name only (e.g. Efteling → efteling). */
export function buildParkSlug(parkName: string, _countryCode?: string): string {
  return buildAsciiSlug(parkName, 80);
}

export function sanitizeParkSlug(raw: string | null | undefined): string | null {
  if (raw == null) return null;

  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }

  value = value.trim().toLowerCase();

  if (!value || value.includes("..") || value.includes("/") || value.includes("\\")) {
    return null;
  }

  if (!SLUG_PATTERN.test(value)) return null;

  return value;
}
