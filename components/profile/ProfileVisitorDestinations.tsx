"use client";

import { Link } from "@/lib/i18n/navigation";
import { profileAllPath } from "@/lib/seo/site";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

type ProfileVisitorDestinationsProps = {
  username: string;
  residence: string | null;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  visitedCodes: string[];
  labels: {
    countriesTitle: string;
    citiesTitle: string;
    parksTitle: string;
    countriesCount: string;
    citiesCount: string;
    parksCount: string;
    show: string;
    viewAll: string;
  };
};

type VisitorDestinationSectionProps = {
  title: string;
  countLabel: string;
  showLabel: string;
  viewAllHref: string;
};

function VisitorDestinationSection({
  title,
  countLabel,
  showLabel,
  viewAllHref,
}: VisitorDestinationSectionProps) {
  return (
    <section className="profile-owner-section profile-owner-section--visitor">
      <div className="profile-owner-section__header">
        <div className="profile-owner-section__intro">
          <h3 className="profile-owner-section__title">{title}</h3>
          <p className="profile-owner-section__count">{countLabel}</p>
        </div>
        <div className="profile-owner-section__actions">
          <Link
            href={viewAllHref}
            className="profile-owner-section__btn profile-owner-section__btn--add"
          >
            {showLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ProfileVisitorDestinations({
  username,
  visitedCountries,
  visitedCities,
  visitedParks,
  visitedCodes,
  labels,
}: ProfileVisitorDestinationsProps) {
  const allHref = profileAllPath(username);
  const hasCountries = visitedCountries.length > 0 || visitedCodes.length > 0;
  const hasCities = visitedCities.length > 0;
  const hasParks = visitedParks.length > 0;

  if (!hasCountries && !hasCities && !hasParks) {
    return null;
  }

  return (
    <div className="profile-owner-tools">
      {hasCountries ? (
        <VisitorDestinationSection
          title={labels.countriesTitle}
          countLabel={labels.countriesCount}
          showLabel={labels.show}
          viewAllHref={`${allHref}#profile-all-countries`}
        />
      ) : null}

      {hasCities ? (
        <VisitorDestinationSection
          title={labels.citiesTitle}
          countLabel={labels.citiesCount}
          showLabel={labels.show}
          viewAllHref={`${allHref}#profile-all-cities`}
        />
      ) : null}

      {hasParks ? (
        <VisitorDestinationSection
          title={labels.parksTitle}
          countLabel={labels.parksCount}
          showLabel={labels.show}
          viewAllHref={`${allHref}#profile-all-parks`}
        />
      ) : null}
    </div>
  );
}
