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

async function searchPixabay(
  query: string,
  apiKey: string,
  page: number
): Promise<{ hits: StockPhotoHit[]; hasMore: boolean }> {
  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("orientation", "horizontal");
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("page", String(page));
  url.searchParams.set("safesearch", "true");

  const res = await fetchWithTimeout(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Pixabay ${res.status}`);
  }

  const data = (await res.json()) as {
    totalHits?: number;
    hits?: Array<{
      id: number;
      pageURL?: string;
      user?: string;
      previewURL?: string;
      webformatURL?: string;
      largeImageURL?: string;
    }>;
  };

  const hits = (data.hits ?? [])
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

  const totalHits = data.totalHits ?? hits.length;
  const hasMore = page * PER_PAGE < totalHits;
  return { hits, hasMore };
}

async function searchUnsplash(
  query: string,
  accessKey: string,
  page: number
): Promise<{ hits: StockPhotoHit[]; hasMore: boolean }> {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("page", String(page));
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
    total_pages?: number;
    results?: Array<{
      id: string;
      urls?: { small?: string; regular?: string };
      user?: { name?: string };
      links?: { html?: string };
    }>;
  };

  const hits = (data.results ?? [])
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

  const totalPages = data.total_pages ?? page;
  return { hits, hasMore: page < totalPages };
}

async function searchPexels(
  query: string,
  apiKey: string,
  page: number
): Promise<{ hits: StockPhotoHit[]; hasMore: boolean }> {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("page", String(page));
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
    page?: number;
    per_page?: number;
    total_results?: number;
    photos?: Array<{
      id: number;
      url?: string;
      photographer?: string;
      src?: { medium?: string; large?: string; large2x?: string; original?: string };
    }>;
  };

  const hits = (data.photos ?? [])
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

  const perPage = data.per_page ?? PER_PAGE;
  const currentPage = data.page ?? page;
  const totalResults = data.total_results ?? hits.length;
  return { hits, hasMore: currentPage * perPage < totalResults };
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

export async function searchStockPhotos(
  query: string,
  page = 1
): Promise<StockPhotoSearchResponse> {
  const q = query.trim();
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const keys = providerKeys();
  const providers: StockPhotoProvider[] = [];
  const providerErrors: Partial<Record<StockPhotoProvider, string>> = {};

  if (!q) {
    return { results: [], providers: [], providerErrors: {}, page: safePage, hasMore: false };
  }

  const tasks: Promise<{ hits: StockPhotoHit[]; hasMore: boolean }>[] = [];

  if (keys.pixabay) {
    providers.push("pixabay");
    tasks.push(
      searchPixabay(q, keys.pixabay, safePage).catch((err) => {
        providerErrors.pixabay = err instanceof Error ? err.message : "Pixabay failed";
        return { hits: [], hasMore: false };
      })
    );
  }
  if (keys.unsplash) {
    providers.push("unsplash");
    tasks.push(
      searchUnsplash(q, keys.unsplash, safePage).catch((err) => {
        providerErrors.unsplash = err instanceof Error ? err.message : "Unsplash failed";
        return { hits: [], hasMore: false };
      })
    );
  }
  if (keys.pexels) {
    providers.push("pexels");
    tasks.push(
      searchPexels(q, keys.pexels, safePage).catch((err) => {
        providerErrors.pexels = err instanceof Error ? err.message : "Pexels failed";
        return { hits: [], hasMore: false };
      })
    );
  }

  if (tasks.length === 0) {
    return { results: [], providers: [], providerErrors: {}, page: safePage, hasMore: false };
  }

  const groups = await Promise.all(tasks);
  const hasMore = groups.some((group) => group.hasMore);
  return {
    results: interleaveHits(groups.map((g) => g.hits)),
    providers,
    providerErrors,
    page: safePage,
    hasMore,
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
