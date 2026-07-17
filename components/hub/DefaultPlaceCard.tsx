import { Link } from "@/lib/i18n/navigation";
import type { ReactNode } from "react";
import { DefaultPlaceCardIllustration } from "@/components/hub/DefaultPlaceCardIllustration";
import { BRAND } from "@/lib/constants";
import { countryPath } from "@/lib/seo/site";

type DefaultPlaceCardProps = {
  placeName: string;
  countryName: string;
  countrySlug: string;
  pinCountLabel: string;
  coverImageUrl?: string | null;
  coverImageAlt?: string;
  actions: ReactNode;
};

export function DefaultPlaceCard({
  placeName,
  countryName,
  countrySlug,
  pinCountLabel,
  coverImageUrl,
  coverImageAlt,
  actions,
}: DefaultPlaceCardProps) {
  return (
    <article className="hub-place-card">
      <div className="hub-place-card__media">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt={coverImageAlt ?? placeName}
            className="hub-place-card__photo"
          />
        ) : (
          <DefaultPlaceCardIllustration />
        )}
      </div>

      <div className="hub-place-card__body">
        <div className="hub-place-card__meta-row">
          <div className="hub-place-card__location">
            <span className="hub-place-card__location-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
                <circle cx="12" cy="11" r="2.2" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <div className="min-w-0">
              <strong className="hub-place-card__place-name" title={placeName}>
                {placeName}
              </strong>
              <Link
                href={countryPath(countrySlug)}
                className="hub-place-card__country-name"
                title={countryName}
              >
                {countryName}
              </Link>
            </div>
          </div>
          <div className="hub-place-card__actions">{actions}</div>
        </div>

        <p className="hub-place-card__social-proof">
          <span className="hub-place-card__social-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          {pinCountLabel}
        </p>
      </div>

      <footer className="hub-place-card__footer">
        <span className="hub-place-card__brand">{BRAND.name}</span>
        <a
          href={`https://${BRAND.domain}`}
          className="hub-place-card__domain"
          target="_blank"
          rel="noopener noreferrer"
        >
          {BRAND.domain}
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
          </svg>
        </a>
      </footer>
    </article>
  );
}
