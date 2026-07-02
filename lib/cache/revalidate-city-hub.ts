import { revalidatePath, revalidateTag } from "next/cache";
import { revalidateCountryHubForPin } from "@/lib/cache/revalidate-country-hub";
import { findCityHubSlug } from "@/lib/data/city-hubs";
import { cityPath } from "@/lib/seo/site";

export function cityPinsCacheTag(countryCode: string, cityName: string): string {
  return `city-pins:${countryCode.toUpperCase()}:${cityName.trim().toLowerCase()}`;
}

/** Bust cached public city hub data after pin create/update/delete. */
export function revalidateCityHubForPin(countryCode: string, cityName: string): void {
  revalidateTag(cityPinsCacheTag(countryCode, cityName), "max");
  revalidateCountryHubForPin(countryCode);

  const slug = findCityHubSlug(countryCode, cityName);
  if (slug) {
    revalidatePath(cityPath(slug));
  }
}
