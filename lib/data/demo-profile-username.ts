import { DEMO_PERSONA } from "@/lib/data/demo-persona";

/** Client-safe check — no server-only imports. */
export function isDemoProfileUsername(username: string): boolean {
  return username.trim().toLowerCase() === DEMO_PERSONA.username;
}
