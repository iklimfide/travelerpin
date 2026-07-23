"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

let profileStatsAnimationPlayed = false;

/** Count-up stats only on the first profile view after a full page load. */
export function useProfileStatsAnimationEnabled(requested: boolean): boolean {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [enabled] = useState(() => requested && !profileStatsAnimationPlayed);

  useEffect(() => {
    if (enabled) {
      profileStatsAnimationPlayed = true;
    }
  }, [enabled]);

  return enabled && !prefersReducedMotion;
}
