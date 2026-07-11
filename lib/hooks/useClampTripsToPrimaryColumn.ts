"use client";

import { useEffect, useRef } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

const LEFT_COLUMN_SELECTORS = [
  ".profile-story-capture",
  ".profile-dashboard-tools",
  ".profile-section.profile-next-route",
];

export function useClampTripsToPrimaryColumn(enabled: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const shell = scrollEl.closest(".profile-shell");
    if (!shell) return;

    const media = window.matchMedia(DESKTOP_QUERY);

    const update = () => {
      if (!media.matches) {
        scrollEl.style.maxHeight = "";
        return;
      }

      const primaryBottom = LEFT_COLUMN_SELECTORS.reduce((maxBottom, selector) => {
        const element = shell.querySelector(selector);
        if (!(element instanceof HTMLElement)) return maxBottom;
        return Math.max(maxBottom, element.getBoundingClientRect().bottom);
      }, 0);

      const scrollTop = scrollEl.getBoundingClientRect().top;
      const maxHeight = Math.floor(primaryBottom - scrollTop);
      scrollEl.style.maxHeight = maxHeight > 0 ? `${maxHeight}px` : "";
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(shell);

    for (const selector of LEFT_COLUMN_SELECTORS) {
      const element = shell.querySelector(selector);
      if (element instanceof HTMLElement) {
        observer.observe(element);
      }
    }

    window.addEventListener("resize", update);
    media.addEventListener("change", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      media.removeEventListener("change", update);
      scrollEl.style.maxHeight = "";
    };
  }, [enabled]);

  return scrollRef;
}
