import { PARK_CUSTOM_HERO_IMAGES_ENABLED } from "@/lib/park/park-hero-images";

const CACHE_VERSION = 7;
/** YP hero images change rarely — avoid hammering API on every profile visit. */
const CACHE_TTL_MS = 30 * 60 * 1000;
const CITY_KEY = `tp:v${CACHE_VERSION}:city-hero-images`;
const PARK_KEY = `tp:v${CACHE_VERSION}:park-hero-images`;

type CachedHeroPayload = {
  v: number;
  at: number;
  images: Record<string, string>;
};

function readCached(key: string): Map<string, string> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedHeroPayload;
    if (parsed.v !== CACHE_VERSION || Date.now() - parsed.at > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return new Map(Object.entries(parsed.images));
  } catch {
    return null;
  }
}

function writeCached(key: string, images: Map<string, string>): void {
  if (typeof window === "undefined") return;
  if (images.size === 0) return;

  try {
    const payload: CachedHeroPayload = {
      v: CACHE_VERSION,
      at: Date.now(),
      images: Object.fromEntries(images),
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Private mode / quota — skip caching.
  }
}

export function readCachedCityHeroImages(): Map<string, string> | null {
  return readCached(CITY_KEY);
}

export function readCachedParkHeroImages(): Map<string, string> | null {
  return readCached(PARK_KEY);
}

export function writeCachedCityHeroImages(images: Map<string, string>): void {
  writeCached(CITY_KEY, images);
}

export function writeCachedParkHeroImages(images: Map<string, string>): void {
  writeCached(PARK_KEY, images);
}

export function invalidateCachedHeroImages(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CITY_KEY);
  sessionStorage.removeItem(PARK_KEY);
  inFlightFetch = null;
}

function readCachedHeroImageMaps(): {
  cityHeroImages: Map<string, string>;
  parkHeroImages: Map<string, string>;
} | null {
  const cityHeroImages = readCachedCityHeroImages();
  if (!cityHeroImages?.size) return null;
  if (!PARK_CUSTOM_HERO_IMAGES_ENABLED) {
    return { cityHeroImages, parkHeroImages: new Map() };
  }
  const parkHeroImages = readCachedParkHeroImages();
  if (!parkHeroImages?.size) return null;
  return { cityHeroImages, parkHeroImages };
}

let inFlightFetch: Promise<{
  cityHeroImages: Map<string, string>;
  parkHeroImages: Map<string, string>;
}> | null = null;

async function fetchHeroImageMapsFromNetwork(): Promise<{
  cityHeroImages: Map<string, string>;
  parkHeroImages: Map<string, string>;
}> {
  const cityResponse = await fetch("/api/city-hero-images");
  const cityPayload = cityResponse.ok ? await cityResponse.json().catch(() => null) : null;
  const cityHeroImages = new Map(
    Object.entries((cityPayload?.images as Record<string, string> | undefined) ?? {})
  );
  writeCachedCityHeroImages(cityHeroImages);

  if (!PARK_CUSTOM_HERO_IMAGES_ENABLED) {
    return { cityHeroImages, parkHeroImages: new Map() };
  }

  const parkResponse = await fetch("/api/park-hero-images");
  const parkPayload = parkResponse.ok ? await parkResponse.json().catch(() => null) : null;
  const parkHeroImages = new Map(
    Object.entries((parkPayload?.images as Record<string, string> | undefined) ?? {})
  );
  writeCachedParkHeroImages(parkHeroImages);

  return { cityHeroImages, parkHeroImages };
}

/** Session-cached hero maps; one network round-trip per tab per TTL window. */
export async function fetchHeroImageMaps(options?: { force?: boolean }): Promise<{
  cityHeroImages: Map<string, string>;
  parkHeroImages: Map<string, string>;
}> {
  if (!options?.force) {
    const cached = readCachedHeroImageMaps();
    if (cached) return cached;
  }

  if (!inFlightFetch) {
    inFlightFetch = fetchHeroImageMapsFromNetwork().finally(() => {
      inFlightFetch = null;
    });
  }

  return inFlightFetch;
}
