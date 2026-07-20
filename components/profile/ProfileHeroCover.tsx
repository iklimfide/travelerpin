import type { ReactNode } from "react";

type ProfileHeroCoverProps = {
  heroTitle: ReactNode;
  heroSubtitle: string;
};

/**
 * Hero title uses CSS clamp + ellipsis (no useLayoutEffect measuring).
 * Measuring scrollWidth after paint caused forced reflows on mobile Lighthouse.
 */
export function ProfileHeroCover({ heroTitle, heroSubtitle }: ProfileHeroCoverProps) {
  const titleText = typeof heroTitle === "string" ? heroTitle : undefined;

  return (
    <header className="profile-hero">
      <div className="profile-hero-card">
        <div className="profile-hero-overlay" aria-hidden />

        <div className="profile-hero-title !max-w-full">
          <h1 className="profile-hero-title__text" title={titleText}>
            {heroTitle}
          </h1>
          <p>{heroSubtitle}</p>
        </div>
      </div>
    </header>
  );
}
