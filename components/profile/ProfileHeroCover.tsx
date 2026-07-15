import type { ReactNode } from "react";

type ProfileHeroCoverProps = {
  heroTitle: ReactNode;
  heroSubtitle: string;
};

export function ProfileHeroCover({ heroTitle, heroSubtitle }: ProfileHeroCoverProps) {
  const titleText = typeof heroTitle === "string" ? heroTitle : undefined;

  return (
    <header className="profile-hero">
      <div className="profile-hero-card">
        <div className="profile-hero-overlay" aria-hidden />

        <div className="profile-hero-title !max-w-full">
          <h1
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
