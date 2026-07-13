/** Fold Turkish I variants so "İstanbul" and "Istanbul" compare equal. */
export function normalizeCityKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("İ", "i");
}

/** "rust" → "Rust", "new york" → "New York", "(ko tapu)" → "(Ko Tapu)" */
export function formatCityDisplayName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;

  return trimmed
    .split(" ")
    .map((word) => {
      if (!word) return word;
      const lower = word.toLocaleLowerCase("tr");

      if (lower.startsWith("(") && lower.length > 1) {
        const innerFirst = lower.charAt(1);
        if (innerFirst) {
          return `(${innerFirst.toLocaleUpperCase("tr")}${lower.slice(2)}`;
        }
      }

      const first = lower.charAt(0);
      if (!first) return word;
      return first.toLocaleUpperCase("tr") + lower.slice(1);
    })
    .join(" ");
}

/** Known public name without trailing official qualifiers in parentheses. */
export function formatKnownPlaceName(name: string): string {
  const stripped = name.replace(/\s*\([^)]*\)\s*$/u, "").trim();
  return formatCityDisplayName(stripped || name);
}
