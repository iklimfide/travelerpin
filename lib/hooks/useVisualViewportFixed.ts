"use client";

import { useEffect, type RefObject } from "react";

type UseVisualViewportFixedOptions = {
  enabled?: boolean;
};

/**
 * Keeps the bottom bar pinned during mobile pinch-zoom only.
 * Offset-only visual viewport shifts (URL bar, iframe scroll) are ignored so
 * the bar does not float or scale with the page.
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
      el.style.removeProperty("transform");
      el.style.removeProperty("transform-origin");
    };

    const sync = () => {
      const { scale, offsetLeft, width } = viewport;
      const zoomed = scale > 1.01;

      if (!zoomed) {
        reset();
        return;
      }

      el.classList.add(anchoredClass);
      el.style.left = `${offsetLeft}px`;
      el.style.width = `${width}px`;
      el.style.right = "auto";
      el.style.bottom = "0px";
      el.style.top = "auto";
      el.style.transform = `scale(${1 / scale})`;
      el.style.transformOrigin = "bottom left";
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
