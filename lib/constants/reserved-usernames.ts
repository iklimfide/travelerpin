/** App routes and reserved words — cannot be registered as usernames. */
export const RESERVED_USERNAMES = new Set([
  "api",
  "auth",
  "country",
  "dashboard",
  "kamikaze",
  "login",
  "og",
  "register",
  "settings",
  "u",
]);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}
