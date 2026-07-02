import { revalidatePath, revalidateTag } from "next/cache";
import { revalidateCountryHubForPin } from "@/lib/cache/revalidate-country-hub";
import { getParkHubBySlug } from "@/lib/data/park-hubs";
import { parkPath } from "@/lib/seo/site";
import { buildParkSlug } from "@/lib/utils/park-slug";

export function parkPinsCacheTag(countryCode: string, parkName: string): string {
  return `park-pins:${countryCode.toUpperCase()}:${parkName.trim().toLowerCase()}`;
}

export function parkHubPinsCacheTag(slug: string): string {
  return `park-pins:hub:${slug.toLowerCase()}`;
}

/** Bust cached public park hub data after pin create/update/delete. */
export function revalidateParkHubForPin(countryCode: string, parkName: string): void {
  revalidateTag(parkPinsCacheTag(countryCode, parkName), "max");
  revalidateCountryHubForPin(countryCode);

  const slug = buildParkSlug(parkName, countryCode);
  revalidateTag(parkHubPinsCacheTag(slug), "max");
  if (getParkHubBySlug(slug)) {
    revalidatePath(parkPath(slug));
  }
}
