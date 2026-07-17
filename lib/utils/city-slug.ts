import { buildAsciiSlug } from "@/lib/utils/ascii-slug";

export function buildCitySlug(cityName: string): string {
  return buildAsciiSlug(cityName, 50);
}
