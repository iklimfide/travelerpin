"use client";

import { useLayoutEffect, useState } from "react";

const DURATION_MS = 900;

/** Count-up animation for profile stats (homepage demo, etc.). */
export function useAnimatedCount(target: number, enabled = true): number {
  const [display, setDisplay] = useState(() => (enabled ? 0 : target));

  useLayoutEffect(() => {
    if (!enabled) {
      setDisplay(target);
      return;
    }

    if (target <= 0) {
      setDisplay(0);
      return;
    }

    setDisplay(0);
    const start = performance.now();
    let frameId = 0;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / DURATION_MS);
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
