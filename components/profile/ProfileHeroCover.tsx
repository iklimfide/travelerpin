import Link from "next/link";
import type { ReactNode } from "react";

type ProfileHeroCoverProps = {
  residence: string | null;
  residenceHref?: string | null;
  heroTitle: ReactNode;
  heroSubtitle: string;
};

export function ProfileHeroCover({
  residence,
  residenceHref,
  heroTitle,
  heroSubtitle,
}: ProfileHeroCoverProps) {
  const residencePill = residence ? (
    <>
      <span aria-hidden>📍</span>
      <span>{residence}</span>
    </>
  ) : null;

  return (
    <header className="profile-hero">
      <div className="profile-hero-card">
        <div className="profile-hero-overlay" aria-hidden />

        <div className="profile-hero-top">
          {residencePill ? (
            residenceHref ? (
              <Link href={residenceHref} className="profile-city-pill profile-city-pill--link">
                {residencePill}
              </Link>
            ) : (
              <div className="profile-city-pill">{residencePill}</div>
            )
          ) : null}
        </div>

        <div className="profile-hero-title">
          <h1>{heroTitle}</h1>
          <p>{heroSubtitle}</p>
        </div>
      </div>
    </header>
  );
}
