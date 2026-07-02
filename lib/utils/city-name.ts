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
