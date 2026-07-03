import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { NotificationsNavLink } from "@/components/notifications/NotificationsNavLink";

type ProfileHeroCoverProps = {
  coverUrl: string | null;
  residence: string | null;
  residenceHref?: string | null;
  heroTitle: ReactNode;
  heroSubtitle: string;
  showNotifications?: boolean;
};

export function ProfileHeroCover({
  coverUrl,
  residence,
  residenceHref,
  heroTitle,
  heroSubtitle,
  showNotifications = false,
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
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            priority
            sizes="(max-width: 480px) 100vw, 480px"
            className="profile-hero-cover-image"
          />
        ) : null}
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
          ) : (
            <span aria-hidden />
          )}
          {showNotifications ? <NotificationsNavLink variant="hero" /> : <span aria-hidden />}
        </div>

        <div className="profile-hero-title">
          <h1>{heroTitle}</h1>
          <p>{heroSubtitle}</p>
        </div>
      </div>
    </header>
  );
}
