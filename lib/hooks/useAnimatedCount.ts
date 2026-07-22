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
    const durationMs = 650;
    const start = performance.now();
    let frameId = 0;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 2;
      setDisplay(Math.round(target * eased));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [enabled, target]);

  return display;
}
