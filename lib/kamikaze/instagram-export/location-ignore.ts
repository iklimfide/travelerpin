import { normalizeCityKey } from "@/lib/utils/city-name";

/** Comma/newline list — matched against IG location label (evden paylaşım). */
export const DEFAULT_IGNORE_POSTING_LOCATION_LABELS =
  "antalya, serik, muratpaşa, muratpasa, kepez, konyaaltı, konyaalti";

export function parseIgnoreLocationLabels(raw: string | null | undefined): Set<string> {
  const set = new Set<string>();
  const source = (raw ?? DEFAULT_IGNORE_POSTING_LOCATION_LABELS).trim();
  if (!source) return set;
  for (const part of source.split(/[\n,;]+/)) {
    const token = part.trim().toLowerCase();
    if (token) set.add(token);
  }
  return set;
}

export function isIgnoredPostingLocationLabel(
  label: string | null | undefined,
  ignoreLabels: Set<string>
): boolean {
  if (!label || ignoreLabels.size === 0) return false;
  const lower = label.trim().toLowerCase();
  if (!lower) return false;

  for (const token of ignoreLabels) {
    if (lower === token) return true;
    if (lower.includes(token)) return true;
  }

  const firstSegment = lower.split(",")[0]?.trim() ?? lower;
  const cityKey = normalizeCityKey(firstSegment);
  for (const token of ignoreLabels) {
    const tokenKey = normalizeCityKey(token.split(",")[0]?.trim() ?? token);
    if (tokenKey && tokenKey === cityKey) return true;
  }

  return false;
}
