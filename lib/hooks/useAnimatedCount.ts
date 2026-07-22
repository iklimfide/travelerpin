"use client";

import { useEffect, useState } from "react";

/** Count-up animation for profile stats while travel data loads in the background. */
export function useAnimatedCount(target: number, enabled = true): number {
  const [display, setDisplay] = useState(() => (enabled ? 0 : target));

  useEffect(() => {
    if (!enabled) {
      setDisplay(target);
      return;
    }

    if (target <= 0) {
      setDisplay(0);
      return;
    }

    setDisplay(0);
    const steps = Math.min(target, 24);
    const stepMs = Math.max(35, Math.round(650 / steps));
    const increment = Math.max(1, Math.ceil(target / steps));
    let current = 0;

    const id = window.setInterval(() => {
      current = Math.min(target, current + increment);
      setDisplay(current);
      if (current >= target) {
        window.clearInterval(id);
      }
    }, stepMs);

    return () => window.clearInterval(id);
  }, [enabled, target]);

  return display;
}
