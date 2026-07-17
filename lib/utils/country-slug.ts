import { buildAsciiSlug } from "@/lib/utils/ascii-slug";

export function buildCountrySlug(countryName: string): string {
  return buildAsciiSlug(countryName, 50);
}
