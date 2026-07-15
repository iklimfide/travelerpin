import { resolveCanonicalNormalizedKey } from "@/lib/utils/city-aliases";
import { normalizeCityKey } from "@/lib/utils/city-name";

export type CatalogOverlayKind = "city" | "park";

/** Country-aware identity key (Goreme ≈ Göreme for TR). */
export function catalogNameKey(name: string, countryCode?: string): string {
  if (countryCode) {
    return resolveCanonicalNormalizedKey(countryCode, name);
  }
  return normalizeCityKey(name);
}

export function catalogExclusionKey(
  kind: CatalogOverlayKind,
  countryCode: string,
  name: string
): string {
  return `${kind}:${countryCode.toUpperCase()}:${catalogNameKey(name, countryCode)}`;
}
