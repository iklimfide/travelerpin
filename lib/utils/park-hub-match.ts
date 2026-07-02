import type { ParkHub } from "@/lib/data/park-hubs";
import { buildParkSlug } from "@/lib/utils/park-slug";

export function uniqueParkSearchNames(...names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

export function parkPinMatchesHub(
  parkName: string,
  countryCode: string,
  hub: ParkHub
): boolean {
  const code = countryCode.toUpperCase();
  if (code !== hub.countryCode.toUpperCase()) return false;

  const normalized = parkName.trim().toLowerCase();
  if (hub.searchNames.some((name) => name.toLowerCase() === normalized)) {
    return true;
  }

  return buildParkSlug(parkName) === hub.slug;
}

export function parkHubMatchOrFilter(hub: ParkHub): string {
  return hub.searchNames
    .map((name) => `park_name.ilike.${quotePostgrestFilterValue(name)}`)
    .join(",");
}

function quotePostgrestFilterValue(value: string): string {
  const escaped = value.replace(/"/g, '\\"');
  return `"${escaped}"`;
}
