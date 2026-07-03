/** Prevent hung Supabase requests from burning Vercel execution time. */
export const SUPABASE_FETCH_TIMEOUT_MS = 4_000;

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(SUPABASE_FETCH_TIMEOUT_MS),
  });
}
