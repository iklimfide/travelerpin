import type { ReactNode } from "react";

type ProfileHeroCoverProps = {
  heroTitle: ReactNode;
  heroSubtitle: string;
};

/**
 * Hero title scales with container width (CSS container queries) so long names
 * stay on one line without ellipsis or scrollWidth measuring.
 */
export function ProfileHeroCover({ heroTitle, heroSubtitle }: ProfileHeroCoverProps) {
  return (
    <header className="profile-hero">
      <div className="profile-hero-card">
        <div className="profile-hero-overlay" aria-hidden />

        <div className="profile-hero-title">
          <h1 className="profile-hero-title__text">{heroTitle}</h1>
          <p>{heroSubtitle}</p>
        </div>
      </div>
    </header>
  );
}
