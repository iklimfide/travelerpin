import { BRAND } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/config";

export function getSiteUrl(): string {
  let url: string;
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    url = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  } else if (process.env.VERCEL_URL) {
    url = `https://${process.env.VERCEL_URL}`;
  } else {
    url = `https://${BRAND.domain}`;
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}

export function profilePath(username: string, _locale?: Locale): string {
  void _locale;
  return `/${username.toLowerCase()}`;
}

export function profileAllPath(username: string, _locale?: Locale): string {
  void _locale;
  return `${profilePath(username)}/all`;
}

export function profileMediaPath(
  username: string,
  tab: "photos" | "instagram" = "photos",
  page = 1,
  _locale?: Locale
): string {
  void _locale;
  const path = `${profilePath(username)}/media`;
  if (tab === "photos" && page <= 1) return path;

  const params = new URLSearchParams();
  if (tab !== "photos") params.set("tab", tab);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function profileUrl(username: string, _locale?: Locale): string {
  void _locale;
  return `${getSiteUrl()}${profilePath(username)}`;
}

/** Profile URL with a stable share query param to bust link-preview caches. */
export function profileShareUrl(username: string, _locale?: Locale): string {
  void _locale;
  return profileUrl(username);
}

export function countryPath(slug: string): string {
  return `/country/${slug.toLowerCase()}`;
}

export function countryUrl(slug: string): string {
  return `${getSiteUrl()}${countryPath(slug)}`;
}

export function cityPath(slug: string): string {
  return `/city/${slug.toLowerCase()}`;
}

export function cityUrl(slug: string): string {
  return `${getSiteUrl()}${cityPath(slug)}`;
}

export function parkPath(slug: string): string {
  return `/park/${slug.toLowerCase()}`;
}

export function parkUrl(slug: string): string {
  return `${getSiteUrl()}${parkPath(slug)}`;
}

export function buildParkPageTitle(parkName: string): string {
  return `${parkName} Travel Map`;
}

export const DEFAULT_DESCRIPTION =
  "Create your personal travel map. Pin countries, cities, parks, and places you've visited, track your travel progress, and share your journey with a single link.";

export const HOME_TITLE = "TravelerPin - Your Travel Map";
export const MY_MAP_TITLE = "Travel Map";

export function travelMapTitle(displayName: string): string {
  return `${displayName}'s Travel Map`;
}
export const EXPLORE_TITLE = "Explore Travelers & Travel Maps";

export function buildCountryPageTitle(countryName: string): string {
  return `${countryName} Travel Map`;
}

export function buildCityPageTitle(cityName: string): string {
  return `${cityName} Travel Map`;
}

export const DEFAULT_KEYWORDS = [
  "travel map",
  "countries visited",
  "travel journal",
  "world map",
  "travel memories",
  "share travel",
  "visited countries checklist",
  "countries visited counter",
  "countries visited counter app",
  "visited countries map percentage",
  "countries visited map",
  "count countries visited",
];
