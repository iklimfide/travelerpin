import { DEFAULT_CITY_HERO_IMAGE } from "@/lib/constants";
import { resolveCityHeroImageUrl } from "@/lib/city/city-hero-images";
import { resolveParkHeroImageUrl } from "@/lib/park/park-hero-images";
import { buildProfileMediaPins } from "@/lib/utils/profile-media";
import { readInstagramUrls, readPhotoUrlsForGallery } from "@/lib/utils/pin-media";
import { canonicalCityName } from "@/lib/utils/city-aliases";
import { normalizeCityKey } from "@/lib/utils/city-name";
import type { VisitedCity, VisitedPark } from "@/types/database";
import type { HubTravelerPin } from "@/lib/supabase/hub-traveler-pin";

/**
 * Optional Jennifer-only stock URLs (R2 or YP). Key: `CC|city-name-key` or `CC|park|park-name-key`.
 * When set, profile gallery uses these instead of guvenc uploads or generic defaults.
 */
export const JENNIFER_DEMO_PHOTO_OVERRIDES: Readonly<Record<string, string>> = {
  "US|los angeles":
    "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/demo/jennifer-los-angeles.jpg",
};

export function jenniferDemoCityPhotoOverrideKey(countryCode: string, cityName: string): string {
  return `${countryCode.toUpperCase()}|${normalizeCityKey(cityName)}`;
}

export function jenniferDemoParkPhotoOverrideKey(
  countryCode: string,
  parkName: string
): string {
  return `${countryCode.toUpperCase()}|park|${normalizeCityKey(parkName)}`;
}

/** Drop traveler-uploaded photos only; Instagram links stay on the pin. */
export function stripJenniferDemoPinUserPhotos<T extends VisitedCity | VisitedPark>(row: T): T {
  const instagramUrls = readInstagramUrls(row);
  const cleared = {
    ...row,
    photo_url: null,
    photo_urls: [],
    media_preview_url: null,
  };

  if (cleared.media_type === "photo") {
    if (instagramUrls.length > 0) {
      return {
        ...cleared,
        media_type: "instagram",
        media_url: instagramUrls[0] ?? null,
      };
    }
    return { ...cleared, media_type: null, media_url: null };
  }

  return cleared;
}

/** @deprecated Use stripJenniferDemoPinUserPhotos */
export const stripJenniferDemoPinUserMedia = stripJenniferDemoPinUserPhotos;

function resolveJenniferCityGalleryPhotoUrl(
  city: VisitedCity,
  cityHeroImages?: ReadonlyMap<string, string>
): string | null {
  const override = JENNIFER_DEMO_PHOTO_OVERRIDES[jenniferDemoCityPhotoOverrideKey(city.country_code, city.city_name)];
  if (override) return override;

  if (!cityHeroImages) return null;

  const canonical = canonicalCityName(city.country_code, city.city_name);
  const heroUrl = resolveCityHeroImageUrl(city.country_code, canonical, cityHeroImages);
  if (heroUrl === DEFAULT_CITY_HERO_IMAGE) return null;
  return heroUrl;
}

function resolveJenniferParkGalleryPhotoUrl(
  park: VisitedPark,
  parkHeroImages?: ReadonlyMap<string, string>
): string | null {
  const override = JENNIFER_DEMO_PHOTO_OVERRIDES[
    jenniferDemoParkPhotoOverrideKey(park.country_code, park.park_name)
  ];
  if (override) return override;

  if (!parkHeroImages) return null;

  return resolveParkHeroImageUrl(
    park.country_code,
    park.park_name,
    park.park_type,
    parkHeroImages
  );
}

export function withJenniferDemoGalleryPhotos(
  cities: VisitedCity[],
  parks: VisitedPark[],
  cityHeroImages?: ReadonlyMap<string, string>,
  parkHeroImages?: ReadonlyMap<string, string>
): { cities: VisitedCity[]; parks: VisitedPark[] } {
  const citiesWithPhotos = cities.map((city) => {
    if (readPhotoUrlsForGallery(city).length > 0) {
      return city;
    }
    const photo_url = resolveJenniferCityGalleryPhotoUrl(city, cityHeroImages);
    if (!photo_url) return city;
    return {
      ...city,
      photo_url,
      photo_urls: [photo_url],
      media_type: "photo" as const,
      media_url: photo_url,
      media_preview_url: photo_url,
    };
  });

  const parksWithPhotos = parks.map((park) => {
    if (readPhotoUrlsForGallery(park).length > 0) {
      return park;
    }
    const photo_url = resolveJenniferParkGalleryPhotoUrl(park, parkHeroImages);
    if (!photo_url) return park;
    return {
      ...park,
      photo_url,
      photo_urls: [photo_url],
      media_type: "photo" as const,
      media_url: photo_url,
      media_preview_url: photo_url,
    };
  });

  return { cities: citiesWithPhotos, parks: parksWithPhotos };
}

type JenniferProfileIdentity = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  instagram_url?: string | null;
};

/** Profile photos + IG post links from @guvencgiller pins; hero/override only when a pin has no upload. */
export function buildJenniferProfileMediaPins(
  cities: VisitedCity[],
  parks: VisitedPark[],
  profile: JenniferProfileIdentity,
  cityHeroImages?: ReadonlyMap<string, string>,
  parkHeroImages?: ReadonlyMap<string, string>
): HubTravelerPin[] {
  const { cities: galleryCities, parks: galleryParks } = withJenniferDemoGalleryPhotos(
    cities,
    parks,
    cityHeroImages,
    parkHeroImages
  );
  return buildProfileMediaPins(galleryCities, galleryParks, profile);
}
