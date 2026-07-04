import { normalizeCityKey } from "@/lib/utils/city-name";

/** Match place names for search — avoids weak mid-word hits for short queries (e.g. "usa" in "Musa"). */
export function matchesPlaceNameSearch(name: string, query: string): boolean {
  // Fold Turkish I variants so "İstanbul" matches "Istanbul".
  const normalizedName = normalizeCityKey(name);
  const q = normalizeCityKey(query);
  if (q.length < 2) return false;
  if (normalizedName.startsWith(q)) return true;

  const words = normalizedName.split(/\s+/);
  if (words.some((word) => word.startsWith(q))) return true;

  if (q.length <= 3) return false;

  return normalizedName.includes(q);
}
