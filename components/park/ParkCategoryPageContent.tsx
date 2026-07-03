import Link from "next/link";
import { HubPageTopBar } from "@/components/hub/HubPageTopBar";
import { formatMessage } from "@/lib/i18n/client-messages";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { getDefaultParkHeroImage } from "@/lib/utils/park-hero-image";
import type { ParkHub } from "@/lib/data/park-hubs";
import { countryPath, parkCategoryPath, parkPath } from "@/lib/seo/site";
import type { ParkCategorySlug } from "@/lib/utils/park-category";

type ParkCategoryPageContentProps = {
  category: ParkCategorySlug;
  parks: ParkHub[];
  loginHref: string;
  registerHref: string;
  isLoggedIn: boolean;
  labels: {
    home: string;
    title: string;
    description: string;
    parkCount: string;
    inCountry: string;
    login: string;
    register: string;
  };
};

export function ParkCategoryPageContent({
  category,
  parks,
  loginHref,
  registerHref,
  isLoggedIn,
  labels,
}: ParkCategoryPageContentProps) {
  const categoryLabel = labels.title;

  return (
    <div className="city-page">
      <HubPageTopBar
        loginHref={loginHref}
        registerHref={registerHref}
        loginLabel={labels.login}
        registerLabel={labels.register}
        showAuthLinks={!isLoggedIn}
      >
        <nav className="city-page__top-nav" aria-label="Park category navigation">
          <Link href="/" className="city-page__nav-badge city-page__nav-badge--icon" aria-label={labels.home}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <path d="M9 22V12h6v10" />
            </svg>
          </Link>
          <Link href={parkCategoryPath(category)} className="city-page__nav-badge city-page__nav-badge--active">
            {categoryLabel}
          </Link>
        </nav>
      </HubPageTopBar>

      <div className="city-page__container">
        <div className="park-category-page__header">
          <h1 className="park-category-page__title">{labels.title}</h1>
          <p className="park-category-page__description">{labels.description}</p>
          <p className="park-category-page__count">{labels.parkCount}</p>
        </div>

        <section className="park-category-page__grid" aria-label={labels.title}>
          <ul className="park-category-page__list">
            {parks.map((park) => {
              const flagUrl = countryCodeToFlagUrl(park.countryCode);
              const heroUrl = getDefaultParkHeroImage(park.parkType);

              return (
                <li key={park.slug} className="park-category-page__card">
                  <Link href={parkPath(park.slug)} className="park-category-page__card-link">
                    <div className="park-category-page__card-image">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={heroUrl} alt="" width={120} height={120} />
                    </div>
                    <h2 className="park-category-page__card-title">{park.name}</h2>
                  </Link>
                  <p className="park-category-page__card-meta">
                    {flagUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={flagUrl} alt="" width={16} height={16} className="park-category-page__flag" />
                    ) : null}
                    <Link href={countryPath(park.countrySlug)} className="city-page__link">
                      {formatMessage(labels.inCountry, { country: park.countryName })}
                    </Link>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
