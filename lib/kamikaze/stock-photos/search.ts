import "server-only";
import type {
  StockPhotoHit,
  StockPhotoProvider,
  StockPhotoSearchResponse,
} from "@/lib/kamikaze/stock-photos/types";

const PER_PAGE = 8;
const FETCH_MS = 12_000;

function providerKeys(): {
  pixabay: string | null;
  unsplash: string | null;
  pexels: string | null;
} {
  return {
    pixabay: process.env.PIXABAY_API_KEY?.trim() || null,
    unsplash: process.env.UNSPLASH_ACCESS_KEY?.trim() || null,
    pexels: process.env.PEXELS_API_KEY?.trim() || null,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function searchPixabay(query: string, apiKey: string): Promise<StockPhotoHit[]> {
  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("safesearch", "true");

  const res = await fetchWithTimeout(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Pixabay ${res.status}`);
  }

  const data = (await res.json()) as {
    hits?: Array<{
      id: number;
      pageURL?: string;
      user?: string;
      previewURL?: string;
      webformatURL?: string;
      largeImageURL?: string;
    }>;
  };

  return (data.hits ?? [])
    .map((hit): StockPhotoHit | null => {
      const imageUrl = hit.largeImageURL?.trim() || hit.webformatURL?.trim();
      const previewUrl = hit.previewURL?.trim() || imageUrl;
      if (!imageUrl || !previewUrl) return null;
      return {
        id: `pixabay:${hit.id}`,
        provider: "pixabay",
        previewUrl,
        imageUrl,
        photographer: hit.user?.trim() || null,
        pageUrl: hit.pageURL?.trim() || null,
      };
    })
    .filter((row): row is StockPhotoHit => row !== null);
}

async function searchUnsplash(query: string, accessKey: string): Promise<StockPhotoHit[]> {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("orientation", "landscape");

  const res = await fetchWithTimeout(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: `Client-ID ${accessKey}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Unsplash ${res.status}`);
  }

  const data = (await res.json()) as {
    results?: Array<{
      id: string;
      urls?: { small?: string; regular?: string };
      user?: { name?: string };
      links?: { html?: string };
    }>;
  };

  return (data.results ?? [])
    .map((photo): StockPhotoHit | null => {
      const imageUrl = photo.urls?.regular?.trim() || photo.urls?.small?.trim();
      const previewUrl = photo.urls?.small?.trim() || imageUrl;
      if (!imageUrl || !previewUrl) return null;
      return {
        id: `unsplash:${photo.id}`,
        provider: "unsplash",
        previewUrl,
        imageUrl,
        photographer: photo.user?.name?.trim() || null,
        pageUrl: photo.links?.html?.trim() || null,
      };
    })
    .filter((row): row is StockPhotoHit => row !== null);
}

async function searchPexels(query: string, apiKey: string): Promise<StockPhotoHit[]> {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("orientation", "landscape");

  const res = await fetchWithTimeout(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: apiKey,
    },
  });
  if (!res.ok) {
    throw new Error(`Pexels ${res.status}`);
  }

  const data = (await res.json()) as {
    photos?: Array<{
      id: number;
      url?: string;
      photographer?: string;
      src?: { medium?: string; large?: string; large2x?: string; original?: string };
    }>;
  };

  return (data.photos ?? [])
    .map((photo): StockPhotoHit | null => {
      const imageUrl =
        photo.src?.large2x?.trim() ||
        photo.src?.large?.trim() ||
        photo.src?.original?.trim() ||
        photo.src?.medium?.trim();
      const previewUrl = photo.src?.medium?.trim() || imageUrl;
      if (!imageUrl || !previewUrl) return null;
      return {
        id: `pexels:${photo.id}`,
        provider: "pexels",
        previewUrl,
        imageUrl,
        photographer: photo.photographer?.trim() || null,
        pageUrl: photo.url?.trim() || null,
      };
    })
    .filter((row): row is StockPhotoHit => row !== null);
}

function interleaveHits(groups: StockPhotoHit[][]): StockPhotoHit[] {
  const merged: StockPhotoHit[] = [];
  const maxLen = Math.max(0, ...groups.map((g) => g.length));
  for (let i = 0; i < maxLen; i += 1) {
    for (const group of groups) {
      const hit = group[i];
      if (hit) merged.push(hit);
    }
  }
  return merged;
}

export async function searchStockPhotos(query: string): Promise<StockPhotoSearchResponse> {
  const q = query.trim();
  const keys = providerKeys();
  const providers: StockPhotoProvider[] = [];
  const providerErrors: Partial<Record<StockPhotoProvider, string>> = {};

  if (!q) {
    return { results: [], providers: [], providerErrors: {} };
  }

  const tasks: Promise<StockPhotoHit[]>[] = [];

  if (keys.pixabay) {
    providers.push("pixabay");
    tasks.push(
      searchPixabay(q, keys.pixabay).catch((err) => {
        providerErrors.pixabay = err instanceof Error ? err.message : "Pixabay failed";
        return [];
      })
    );
  }
  if (keys.unsplash) {
    providers.push("unsplash");
    tasks.push(
      searchUnsplash(q, keys.unsplash).catch((err) => {
        providerErrors.unsplash = err instanceof Error ? err.message : "Unsplash failed";
        return [];
      })
    );
  }
  if (keys.pexels) {
    providers.push("pexels");
    tasks.push(
      searchPexels(q, keys.pexels).catch((err) => {
        providerErrors.pexels = err instanceof Error ? err.message : "Pexels failed";
        return [];
      })
    );
  }

  if (tasks.length === 0) {
    return { results: [], providers: [], providerErrors: {} };
  }

  const groups = await Promise.all(tasks);
  return {
    results: interleaveHits(groups),
    providers,
    providerErrors,
  };
}

export function configuredStockPhotoProviders(): StockPhotoProvider[] {
  const keys = providerKeys();
  const out: StockPhotoProvider[] = [];
  if (keys.pixabay) out.push("pixabay");
  if (keys.unsplash) out.push("unsplash");
  if (keys.pexels) out.push("pexels");
  return out;
}
