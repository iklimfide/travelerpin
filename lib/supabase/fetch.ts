/** Prevent hung Supabase requests from burning Vercel execution time. */
export const SUPABASE_FETCH_TIMEOUT_MS = 4_000;
/** Full hero-map SELECTs only — not used for homepage/profile HTML. */
export const SUPABASE_HERO_FETCH_TIMEOUT_MS = 8_000;

export function fetchWithTimeoutMs(timeoutMs: number) {
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
    fetch(input, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
    });
}

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetchWithTimeoutMs(SUPABASE_FETCH_TIMEOUT_MS)(input, init);
}
