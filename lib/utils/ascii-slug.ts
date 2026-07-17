/**
 * URL-safe ASCII slug from a place name.
 * Folds Latin letters with diacritics (Düsseldorf → dusseldorf) instead of
 * dropping them (which produced broken slugs like d-sseldorf).
 */
export function buildAsciiSlug(name: string, maxLength = 50): string {
  const folded = foldLatinLetters(name.trim());
  return folded
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

/**
 * Old SQL/seed slug style: non-ASCII letters became hyphens (ü → -).
 * Kept only to resolve / redirect legacy hub URLs.
 */
export function buildLegacyStrippedSlug(name: string, maxLength = 50): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

/** Characters that do not NFD-decompose into ASCII base letters. */
function foldLatinLetters(value: string): string {
  return value
    .replaceAll("ß", "ss")
    .replaceAll("ẞ", "ss")
    .replaceAll("ı", "i")
    .replaceAll("İ", "i")
    .replaceAll("æ", "ae")
    .replaceAll("Æ", "ae")
    .replaceAll("œ", "oe")
    .replaceAll("Œ", "oe")
    .replaceAll("ø", "o")
    .replaceAll("Ø", "o")
    .replaceAll("ð", "d")
    .replaceAll("Ð", "d")
    .replaceAll("þ", "th")
    .replaceAll("Þ", "th")
    .replaceAll("ł", "l")
    .replaceAll("Ł", "l")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "d")
    .replaceAll("ħ", "h")
    .replaceAll("Ħ", "h");
}
