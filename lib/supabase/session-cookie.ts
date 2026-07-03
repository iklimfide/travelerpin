/** True when the request carries a Supabase auth session cookie. */
export function hasSupabaseAuthCookie(
  cookies: { name: string }[] | { getAll(): { name: string }[] }
): boolean {
  const list = Array.isArray(cookies) ? cookies : cookies.getAll();
  return list.some((cookie) => cookie.name.includes("auth-token"));
}
