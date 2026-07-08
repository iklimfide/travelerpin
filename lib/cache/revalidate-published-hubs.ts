import { revalidateTag } from "next/cache";

export const PUBLISHED_CITY_KEYS_TAG = "published-city-keys";
export const PUBLISHED_PARK_KEYS_TAG = "published-park-keys";
export const PUBLISHED_CITY_SLUGS_TAG = "published-city-slugs";
export const PUBLISHED_PARK_SLUGS_TAG = "published-park-slugs";

/** Bust cached published hub lists after a new hub is published. */
export function revalidatePublishedHubKeys(): void {
  revalidateTag(PUBLISHED_CITY_KEYS_TAG, "max");
  revalidateTag(PUBLISHED_PARK_KEYS_TAG, "max");
  revalidateTag(PUBLISHED_CITY_SLUGS_TAG, "max");
  revalidateTag(PUBLISHED_PARK_SLUGS_TAG, "max");
}
