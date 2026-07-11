"use client";

import { useEffect, type RefObject } from "react";

type UseVisualViewportFixedOptions = {
  enabled?: boolean;
};

/**
 * Pins fixed bottom chrome to the visual viewport (like a top bar), so it stays
 * aligned on mobile scroll, URL-bar resize, and pinch-zoom.
 */
export function useVisualViewportFixed(
  ref: RefObject<HTMLElement | null>,
  { enabled = true }: UseVisualViewportFixedOptions = {}
) {
  useEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    const viewport = window.visualViewport;
    if (!el || !viewport) return;

    const anchoredClass = "is-visual-viewport-anchored";
    let frame = 0;

    const clearInlineStyles = () => {
      el.classList.remove(anchoredClass);
      el.style.removeProperty("top");
      el.style.removeProperty("left");
      el.style.removeProperty("width");
      el.style.removeProperty("right");
      el.style.removeProperty("bottom");
      el.style.removeProperty("transform");
      el.style.removeProperty("transform-origin");
    };

    const sync = () => {
      const { offsetTop, offsetLeft, width, height, scale } = viewport;

      el.classList.add(anchoredClass);
      el.style.left = `${offsetLeft}px`;
      el.style.right = "auto";
      el.style.top = "auto";
      el.style.bottom = `${window.innerHeight - offsetTop - height}px`;

      if (scale > 1.001) {
        el.style.width = `${width * scale}px`;
        el.style.transform = `scale(${1 / scale})`;
        el.style.transformOrigin = "bottom left";
      } else {
        el.style.width = `${width}px`;
        el.style.removeProperty("transform");
        el.style.removeProperty("transform-origin");
      }
    };

    const scheduleSync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };

    viewport.addEventListener("resize", scheduleSync);
    viewport.addEventListener("scroll", scheduleSync);
    window.addEventListener("resize", scheduleSync);
    window.addEventListener("orientationchange", scheduleSync);
    scheduleSync();

    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", scheduleSync);
      viewport.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("orientationchange", scheduleSync);
      clearInlineStyles();
    };
  }, [enabled, ref]);
}
