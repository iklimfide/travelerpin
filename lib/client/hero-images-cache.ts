const CACHE_VERSION = 2;
const CACHE_TTL_MS = 5 * 60 * 1000;
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
}

export async function fetchHeroImageMaps(): Promise<{
  cityHeroImages: Map<string, string>;
  parkHeroImages: Map<string, string>;
}> {
  const [cityResponse, parkResponse] = await Promise.all([
    fetch("/api/city-hero-images"),
    fetch("/api/park-hero-images"),
  ]);

  const cityPayload = cityResponse.ok ? await cityResponse.json().catch(() => null) : null;
  const parkPayload = parkResponse.ok ? await parkResponse.json().catch(() => null) : null;

  const cityHeroImages = new Map(
    Object.entries((cityPayload?.images as Record<string, string> | undefined) ?? {})
  );
  const parkHeroImages = new Map(
    Object.entries((parkPayload?.images as Record<string, string> | undefined) ?? {})
  );

  writeCachedCityHeroImages(cityHeroImages);
  writeCachedParkHeroImages(parkHeroImages);

  return { cityHeroImages, parkHeroImages };
}
