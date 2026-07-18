"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type ProfileHeroCoverProps = {
  heroTitle: ReactNode;
  heroSubtitle: string;
};

/** Below this size the title stays ellipsized instead of shrinking further. */
const MIN_TITLE_FONT_PX = 14;

export function ProfileHeroCover({ heroTitle, heroSubtitle }: ProfileHeroCoverProps) {
  const titleText = typeof heroTitle === "string" ? heroTitle : undefined;
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Long names (e.g. "Arif GÜVENÇ'in Seyahat Haritası") overflow the nowrap
  // heading on mobile; shrink the font just enough to fit on one line.
  useLayoutEffect(() => {
    const title = titleRef.current;
    if (!title) return;

    const fit = () => {
      title.style.fontSize = "";
      if (title.scrollWidth <= title.clientWidth) return;
      const baseSize = Number.parseFloat(window.getComputedStyle(title).fontSize);
      const fittedSize = Math.max(
        (title.clientWidth / title.scrollWidth) * baseSize * 0.99,
        MIN_TITLE_FONT_PX
      );
      title.style.fontSize = `${fittedSize}px`;
    };

    fit();

    const container = title.parentElement;
    if (!container) return;
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [heroTitle]);

  return (
    <header className="profile-hero">
      <div className="profile-hero-card">
        <div className="profile-hero-overlay" aria-hidden />

        <div className="profile-hero-title !max-w-full">
          <h1
            ref={titleRef}
            className="!mb-1.5 !overflow-hidden !text-ellipsis !whitespace-nowrap"
            title={titleText}
          >
            {heroTitle}
          </h1>
          <p>{heroSubtitle}</p>
        </div>
      </div>
    </header>
  );
}
