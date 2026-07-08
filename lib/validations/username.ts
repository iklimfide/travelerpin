import { z } from "zod";
import { LIMITS } from "@/lib/constants";
import { isReservedUsername } from "@/lib/constants/reserved-usernames";
import { normalizeUsernameInput } from "@/lib/utils/username";

export const usernameSchema = z
  .string()
  .min(LIMITS.usernameMin, `Username must be at least ${LIMITS.usernameMin} characters`)
  .max(LIMITS.usernameMax, `Username must be at most ${LIMITS.usernameMax} characters`)
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores")
  .transform((value) => normalizeUsernameInput(value))
  .refine((value) => !isReservedUsername(value), "This username is not available");

export type UsernameUnavailableReason = "invalid" | "reserved" | "taken";

export function getUsernameUnavailableReason(
  username: string
): UsernameUnavailableReason | null {
  const normalized = normalizeUsernameInput(username);
  if (normalized.length < LIMITS.usernameMin) return "invalid";
  if (normalized.length > LIMITS.usernameMax) return "invalid";
  if (!/^[a-z0-9_]+$/.test(normalized)) return "invalid";
  if (isReservedUsername(normalized)) return "reserved";
  return null;
}
