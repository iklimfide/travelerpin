"use client";

import { useEffect, useRef } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

export function useClampTripsToPrimaryColumn(enabled: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const primaryCol = scrollEl
      .closest(".profile-shell")
      ?.querySelector("[data-profile-desktop-primary]") as HTMLElement | null;
    if (!primaryCol) return;

    const media = window.matchMedia(DESKTOP_QUERY);

    const update = () => {
      if (!media.matches) {
        scrollEl.style.maxHeight = "";
        return;
      }

      const primaryBottom = primaryCol.getBoundingClientRect().bottom;
      const scrollTop = scrollEl.getBoundingClientRect().top;
      const maxHeight = Math.floor(primaryBottom - scrollTop);
      scrollEl.style.maxHeight = maxHeight > 0 ? `${maxHeight}px` : "";
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(primaryCol);

    const secondaryCol = scrollEl.closest(".profile-desktop-column--secondary");
    if (secondaryCol) {
      observer.observe(secondaryCol);
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
