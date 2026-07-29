import { DEMO_PERSONA } from "@/lib/data/demo-persona";
import { isDemoProfileUsername as isDemoProfileUsernameImpl } from "@/lib/data/showcase-profile";

export function isDemoProfileUsername(username: string): boolean {
  return isDemoProfileUsernameImpl(username);
}

export { isShowcaseProfileUsername } from "@/lib/data/showcase-profile";
