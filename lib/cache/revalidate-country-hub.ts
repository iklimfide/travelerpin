import { revalidatePath, revalidateTag } from "next/cache";
import { getCountryHubByCode } from "@/lib/data/country-hubs";
import { countryPath } from "@/lib/seo/site";

export function countryPinsCacheTag(countryCode: string): string {
  return `country-pins:${countryCode.toUpperCase()}`;
}

/** Bust cached public country hub memories after city/park pin changes. */
export function revalidateCountryHubForPin(countryCode: string): void {
  revalidateTag(countryPinsCacheTag(countryCode), "max");

  const hub = getCountryHubByCode(countryCode);
  if (hub) {
    revalidatePath(countryPath(hub.slug));
  }
}
