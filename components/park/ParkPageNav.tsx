import { Link } from "@/lib/i18n/navigation";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { countryPath } from "@/lib/seo/site";
import type { ParkHub } from "@/lib/data/park-hubs";

type ParkPageNavProps = {
  hub: ParkHub;
  labels: {
    home: string;
  };
};

export function ParkPageNav({ hub, labels }: ParkPageNavProps) {
  const flagUrl = countryCodeToFlagUrl(hub.countryCode);

  return (
    <nav className="city-page__top-nav" aria-label="Park navigation">
      <Link href="/" className="city-page__nav-badge city-page__nav-badge--icon" aria-label={labels.home}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M9 22V12h6v10" />
        </svg>
      </Link>
      <Link href={countryPath(hub.countrySlug)} className="city-page__nav-badge">
        {flagUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={flagUrl} alt="" className="city-page__nav-flag" width={18} height={18} />
        ) : null}
        {hub.countryName}
      </Link>
      <span className="city-page__nav-badge city-page__nav-badge--active">{hub.name}</span>
    </nav>
  );
}
