import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo/site";

export const OG_IMAGE_PATH = "/images/og-share-card.png";

export const OG_IMAGE_SIZE = { width: 1024, height: 540 } as const;

export const PIN_MAP_OG_TITLE = "Traveler's Pin Map";

export const PIN_MAP_OG_DESCRIPTION =
  'Answer "How many countries have been explored?" with a single link. Share a global map of shared adventures.';

export function staticOgImageUrl(): string {
  return `${getSiteUrl()}${OG_IMAGE_PATH}`;
}

export const STATIC_OG_IMAGE = {
  url: OG_IMAGE_PATH,
  width: OG_IMAGE_SIZE.width,
  height: OG_IMAGE_SIZE.height,
  alt: PIN_MAP_OG_TITLE,
  type: "image/png",
} as const;

/** Shared Open Graph image block for every public page. */
export function staticOpenGraphImages(): NonNullable<Metadata["openGraph"]>["images"] {
  return [STATIC_OG_IMAGE];
}

export function staticTwitterImages(): NonNullable<Metadata["twitter"]>["images"] {
  return [staticOgImageUrl()];
}
