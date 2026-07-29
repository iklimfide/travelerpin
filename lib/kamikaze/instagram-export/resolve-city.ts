import {
  filterPlaceHashtags,
  normalizeHashtagKey,
} from "@/lib/kamikaze/instagram-export/hashtags";
import { isIgnoredPostingLocationLabel } from "@/lib/kamikaze/instagram-export/location-ignore";
import { formatCityDisplayName, normalizeCityKey } from "@/lib/utils/city-name";

const NOMINATIM_DELAY_MS = 1100;
const USER_AGENT = "TravelerPin/1.0 (https://travelerpin.com; instagram-import)";

export type ImportCityMeta = {
  city_name: string;
  country_code: string;
  country_name: string;
  latitude: number | null;
  longitude: number | null;
  bucket: string;
};

export type LocationMap = Record<
  string,
  {
    city_name: string;
    country_code: string;
    country_name: string;
  }
>;

let lastNominatimAt = 0;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function nominatimFetch(url: string): Promise<unknown> {
  const now = Date.now();
  const wait = Math.max(0, lastNominatimAt + NOMINATIM_DELAY_MS - now);
  if (wait > 0) await sleep(wait);
  lastNominatimAt = Date.now();

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Nominatim ${response.status}`);
  }
  return response.json();
}

async function reverseGeocodeCity(lat: number, lon: number): Promise<Omit<ImportCityMeta, "bucket"> | null> {
  const data = (await nominatimFetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`
  )) as {
    address?: Record<string, string | undefined>;
    name?: string;
  };

  const address = data?.address ?? {};
  const cityName =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county ??
    data?.name;
  const countryCode = address.country_code?.toUpperCase();
  if (!cityName || !countryCode) return null;

  return {
    city_name: formatCityDisplayName(String(cityName)),
    country_code: countryCode,
    country_name: address.country ?? countryCode,
    latitude: lat,
    longitude: lon,
  };
}

async function forwardGeocodeLocationLabel(
  label: string
): Promise<Omit<ImportCityMeta, "bucket"> | null> {
  const data = (await nominatimFetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(label)}&limit=1&addressdetails=1`
  )) as Array<{
    lat?: string;
    lon?: string;
    name?: string;
    address?: Record<string, string | undefined>;
  }>;

  const hit = data?.[0];
  if (!hit) return null;
  const address = hit.address ?? {};
  const cityName =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    hit.name;
  const countryCode = address.country_code?.toUpperCase();
  if (!cityName || !countryCode) return null;

  return {
    city_name: formatCityDisplayName(String(cityName)),
    country_code: countryCode,
    country_name: address.country ?? countryCode,
    latitude: Number(hit.lat),
    longitude: Number(hit.lon),
  };
}

export function cityBucket(meta: Pick<ImportCityMeta, "country_code" | "city_name">): string {
  return `${meta.country_code.toUpperCase()}|${normalizeCityKey(meta.city_name)}`;
}

export type CityResolveSource =
  | "location_map"
  | "location_geocode"
  | "location_ignored"
  | "hashtag_map"
  | "hashtag_geocode"
  | "gps"
  | "unassigned";

export type ResolvedCityForPost = {
  city: ImportCityMeta;
  source: CityResolveSource;
};

function metaFromMapEntry(
  mapped: LocationMap[string],
  source: CityResolveSource
): ResolvedCityForPost {
  const bucket = cityBucket(mapped);
  return {
    city: { ...mapped, latitude: null, longitude: null, bucket },
    source,
  };
}

const MAX_HASHTAG_GEOCODE_TRIES = 3;

async function resolveFromHashtags(
  hashtags: string[],
  locationMap: LocationMap,
  geocodeHashtags: boolean
): Promise<ResolvedCityForPost | null> {
  const tags = filterPlaceHashtags(hashtags);
  if (tags.length === 0) return null;

  for (const tag of tags) {
    const key = normalizeHashtagKey(tag);
    const mapped =
      locationMap[key] ?? locationMap[`#${key}`] ?? locationMap[tag] ?? locationMap[`#${tag}`];
    if (mapped) {
      return metaFromMapEntry(mapped, "hashtag_map");
    }
  }

  if (!geocodeHashtags) return null;

  let tries = 0;
  for (const tag of tags) {
    if (tries >= MAX_HASHTAG_GEOCODE_TRIES) break;
    const fromTag = await forwardGeocodeLocationLabel(tag.replace(/_/g, " "));
    tries += 1;
    if (fromTag) {
      return {
        city: { ...fromTag, bucket: cityBucket(fromTag) },
        source: "hashtag_geocode",
      };
    }
  }

  return null;
}

export async function resolveCityForPost(
  post: {
    locationLabel: string | null;
    hashtags?: string[];
    exif: { latitude: number; longitude: number } | null;
  },
  locationMap: LocationMap,
  options?: {
    geocodeHashtags?: boolean;
    geocodeGps?: boolean;
    ignoreLocationLabels?: Set<string>;
  }
): Promise<ResolvedCityForPost> {
  const geocodeHashtags = options?.geocodeHashtags !== false;
  const geocodeGps = options?.geocodeGps !== false;
  const ignoreLocationLabels = options?.ignoreLocationLabels ?? new Set<string>();

  const locationIgnored =
    post.locationLabel != null &&
    isIgnoredPostingLocationLabel(post.locationLabel, ignoreLocationLabels);

  if (post.locationLabel && locationMap[post.locationLabel]) {
    return metaFromMapEntry(locationMap[post.locationLabel], "location_map");
  }

  const fromHashtags = await resolveFromHashtags(post.hashtags ?? [], locationMap, geocodeHashtags);
  if (fromHashtags) return fromHashtags;

  if (post.locationLabel && !locationIgnored) {
    const fromLabel = await forwardGeocodeLocationLabel(post.locationLabel);
    if (fromLabel) {
      return {
        city: { ...fromLabel, bucket: cityBucket(fromLabel) },
        source: "location_geocode",
      };
    }
  }

  if (geocodeGps && post.exif && !locationIgnored) {
    const fromGps = await reverseGeocodeCity(post.exif.latitude, post.exif.longitude);
    if (fromGps) {
      return {
        city: { ...fromGps, bucket: cityBucket(fromGps) },
        source: "gps",
      };
    }
  }

  if (locationIgnored && post.locationLabel) {
    return {
      city: {
        city_name: "",
        country_code: "",
        country_name: "",
        latitude: null,
        longitude: null,
        bucket: "__unassigned__",
      },
      source: "location_ignored",
    };
  }

  return {
    city: {
      city_name: "",
      country_code: "",
      country_name: "",
      latitude: null,
      longitude: null,
      bucket: "__unassigned__",
    },
    source: "unassigned",
  };
}
