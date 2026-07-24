import { Link } from "@/lib/i18n/navigation";

export type CountryHubPlaceLink = {
  label: string;
  href?: string;
  meta?: string;
};

type CountryPageHubPlaceListsProps = {
  citiesHeading: string;
  parksHeading: string;
  cities: CountryHubPlaceLink[];
  parks: CountryHubPlaceLink[];
};

export function CountryPageHubPlaceLists({
  citiesHeading,
  parksHeading,
  cities,
  parks,
}: CountryPageHubPlaceListsProps) {
  if (cities.length === 0 && parks.length === 0) return null;

  return (
    <>
      {cities.length > 0 ? (
        <section className="city-page__section" aria-labelledby="country-hub-cities">
          <h2 id="country-hub-cities" className="city-page__section-title">
            {citiesHeading}
          </h2>
          <ul className="city-page__place-list">
            {cities.map((item) => (
              <li key={item.href ?? item.label}>
                {item.href ? (
                  <Link href={item.href} className="city-page__place-chip" prefetch={false}>
                    <span className="city-page__place-chip-name">{item.label}</span>
                  </Link>
                ) : (
                  <span className="city-page__place-chip city-page__place-chip--static">
                    <span className="city-page__place-chip-name">{item.label}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {parks.length > 0 ? (
        <section className="city-page__section" aria-labelledby="country-hub-parks">
          <h2 id="country-hub-parks" className="city-page__section-title">
            {parksHeading}
          </h2>
          <ul className="city-page__place-list">
            {parks.map((item) => (
              <li key={item.href ?? item.label}>
                {item.href ? (
                  <Link href={item.href} className="city-page__place-chip" prefetch={false}>
                    <span className="city-page__place-chip-name">{item.label}</span>
                    {item.meta ? (
                      <span className="city-page__place-chip-meta">{item.meta}</span>
                    ) : null}
                  </Link>
                ) : (
                  <span className="city-page__place-chip city-page__place-chip--static">
                    <span className="city-page__place-chip-name">{item.label}</span>
                    {item.meta ? (
                      <span className="city-page__place-chip-meta">{item.meta}</span>
                    ) : null}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
