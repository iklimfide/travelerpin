import { Link } from "@/lib/i18n/navigation";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import type { CountryHub } from "@/lib/data/country-hubs";

type CountryPageNavProps = {
  hub: CountryHub;
  labels: {
    home: string;
  };
};

export function CountryPageNav({ hub, labels }: CountryPageNavProps) {
  const flagUrl = countryCodeToFlagUrl(hub.code);

  return (
    <nav className="city-page__top-nav" aria-label="Breadcrumb navigation">
      <Link href="/" className="city-page__nav-badge city-page__nav-badge--icon" aria-label={labels.home}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M9 22V12h6v10" />
        </svg>
      </Link>
      <span className="city-page__nav-badge city-page__nav-badge--active" aria-current="page">
        {flagUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={flagUrl} alt="" width={18} height={18} className="city-page__nav-flag" />
        ) : null}
        <span>{hub.name}</span>
      </span>
    </nav>
  );
}
