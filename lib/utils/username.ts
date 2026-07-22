import { LIMITS } from "@/lib/constants";

/** Lowercase trimmed username for validation, URLs, and uniqueness checks. */
export function normalizeUsernameInput(username: string): string {
  return username.toLowerCase().trim();
}

const PROFILE_USERNAME_RE = /^[a-z0-9_]+$/;

/** Cheap guard before Supabase — rejects old blog slugs, bots, and malformed paths. */
export function isPlausibleProfileUsername(username: string): boolean {
  const normalized = normalizeUsernameInput(username);
  if (normalized.length < LIMITS.usernameMin) return false;
  if (normalized.length > LIMITS.usernameMax) return false;
  return PROFILE_USERNAME_RE.test(normalized);
}
