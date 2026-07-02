const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

function slugifyParkName(parkName: string): string {
  return parkName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Park URL slug from name only (e.g. Efteling → efteling). */
export function buildParkSlug(parkName: string, _countryCode?: string): string {
  return slugifyParkName(parkName);
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
