import type { StockPhotoHit, StockPhotoProvider } from "@/lib/kamikaze/stock-photos/types";

export type StockPhotoPageResult = {
  results: StockPhotoHit[];
  providers: StockPhotoProvider[];
  hasMore: boolean;
  error?: string;
  status: number;
};

const memoryCache = new Map<string, StockPhotoPageResult>();
const inFlight = new Map<string, Promise<StockPhotoPageResult>>();

function cacheKey(query: string, page: number): string {
  return `${query.trim().toLowerCase()}:${page}`;
}

async function fetchStockPhotoPageFromNetwork(
  query: string,
  page: number
): Promise<StockPhotoPageResult> {
  const q = query.trim();
  const res = await fetch(
    `/api/kamikaze/stock-photos?q=${encodeURIComponent(q)}&page=${page}`
  );
  const data = (await res.json()) as {
    results?: StockPhotoHit[];
    providers?: StockPhotoProvider[];
    hasMore?: boolean;
    error?: string;
  };

  const result: StockPhotoPageResult = {
    results: data.results ?? [],
    providers: data.providers ?? [],
    hasMore: Boolean(data.hasMore),
    error: data.error,
    status: res.status,
  };

  if (res.ok) {
    memoryCache.set(cacheKey(q, page), result);
  }

  return result;
}

/** Session memory cache + in-flight dedupe for stock photo search pages. */
export async function fetchStockPhotoPage(
  query: string,
  page: number
): Promise<StockPhotoPageResult> {
  const q = query.trim();
  if (!q) {
    return { results: [], providers: [], hasMore: false, status: 400 };
  }

  const key = cacheKey(q, page);
  const cached = memoryCache.get(key);
  if (cached) return cached;

  let pending = inFlight.get(key);
  if (!pending) {
    pending = fetchStockPhotoPageFromNetwork(q, page).finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, pending);
  }

  return pending;
}
