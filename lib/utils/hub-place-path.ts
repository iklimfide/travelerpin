import { findCityHubSlug } from "@/lib/data/city-hubs";
import { findParkHubSlug } from "@/lib/data/park-hubs";
import { cityPath, parkPath } from "@/lib/seo/site";
import { buildCitySlug } from "@/lib/utils/city-slug";
import { buildParkSlug } from "@/lib/utils/park-slug";

export function cityPlacePath(countryCode: string, cityName: string): string {
  const slug = findCityHubSlug(countryCode, cityName) ?? buildCitySlug(cityName);
  return cityPath(slug);
}

export function parkPlacePath(parkName: string, countryCode: string): string {
  const slug = findParkHubSlug(parkName, countryCode) ?? buildParkSlug(parkName, countryCode);
  return parkPath(slug);
}
