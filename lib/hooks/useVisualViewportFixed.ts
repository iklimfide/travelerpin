"use client";

import { useEffect, type RefObject } from "react";

type UseVisualViewportFixedOptions = {
  enabled?: boolean;
};

/**
 * Pins a position:fixed footer to the visual viewport while the page is pinch-zoomed.
 * Without this, mobile browsers scale fixed chrome with the page and it can cover content.
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

    const reset = () => {
      el.classList.remove(anchoredClass);
      el.style.removeProperty("top");
      el.style.removeProperty("left");
      el.style.removeProperty("width");
      el.style.removeProperty("right");
      el.style.removeProperty("bottom");
    };

    const sync = () => {
      const { scale, offsetTop, offsetLeft, height, width } = viewport;
      const needsAnchor = scale > 1 || offsetTop !== 0 || offsetLeft !== 0;

      if (!needsAnchor) {
        reset();
        return;
      }

      const rect = el.getBoundingClientRect();
      el.classList.add(anchoredClass);
      el.style.left = `${offsetLeft}px`;
      el.style.width = `${width}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
      el.style.top = `${offsetTop + height - rect.height}px`;
    };

    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);
    sync();

    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
      reset();
    };
  }, [enabled, ref]);
}
