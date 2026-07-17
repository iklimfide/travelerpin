"use client";

import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import { useLocale } from "next-intl";
import { useState, type ReactNode } from "react";
import {
  ProfileCityLink,
  ProfileCountryLink,
  ProfileParkLink,
} from "@/components/profile/ProfilePlaceLink";
import { profileAllPath } from "@/lib/seo/site";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { buildProfileAllDestinations } from "@/lib/utils/profile-all-destinations";
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
  viewAllLabel: string;
  children: ReactNode;
};

function ProfileVisitorDestinationRow({
  countryCode,
  subtitle,
  titleNode,
}: {
  countryCode: string;
  subtitle?: string | null;
  titleNode: ReactNode;
}) {
  const flagUrl = countryCode ? countryCodeToFlagUrl(countryCode) : "";

  return (
    <li className="profile-next-route-item">
      <div className="profile-next-route-row">
        {flagUrl ? (
          <span className="profile-next-route-flag">
            <Image
              src={flagUrl}
              alt=""
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          </span>
        ) : null}
        <span className="profile-next-route-text">
          {titleNode}
          {subtitle ? (
            <span className="profile-next-route-meta" title={subtitle}>
              {subtitle}
            </span>
          ) : null}
        </span>
      </div>
    </li>
  );
}

function VisitorDestinationSection({
  title,
  countLabel,
  showLabel,
  viewAllHref,
  viewAllLabel,
  children,
}: VisitorDestinationSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="profile-owner-section profile-owner-section--visitor">
      <div className="profile-owner-section__header">
        <div className="profile-owner-section__intro">
          <h3 className="profile-owner-section__title">{title}</h3>
          <p className="profile-owner-section__count">{countLabel}</p>
        </div>
        <div className="profile-owner-section__actions">
          <button
            type="button"
            className={`profile-owner-section__btn${
              open ? " profile-owner-section__btn--active" : " profile-owner-section__btn--add"
            }`}
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
          >
            {showLabel}
          </button>
        </div>
      </div>

      {open ? (
        <div className="profile-owner-section__body profile-owner-section__body--edit profile-visitor-section__body">
          {children}
          <Link href={viewAllHref} className="profile-owner-map-link">
            {viewAllLabel}
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export function ProfileVisitorDestinations({
  username,
  residence,
  visitedCountries,
  visitedCities,
  visitedParks,
  visitedCodes,
  labels,
}: ProfileVisitorDestinationsProps) {
  const locale = useLocale() === "tr" ? "tr" : "en";
  const destinations = buildProfileAllDestinations(
    visitedCountries,
    visitedCities,
    visitedParks,
    [],
    visitedCodes,
    residence,
    locale
  );

  const allHref = profileAllPath(username);
  const hasCountries = destinations.countries.length > 0;
  const hasCities = destinations.cities.length > 0;
  const hasParks = destinations.parks.length > 0;

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
          viewAllLabel={labels.viewAll}
        >
          <ul className="profile-next-route-list">
            {destinations.countries.map((country) => (
              <ProfileVisitorDestinationRow
                key={country.code}
                countryCode={country.code}
                titleNode={
                  <ProfileCountryLink
                    slug={country.countrySlug}
                    name={country.name}
                    className="profile-next-route-name profile-next-route-link"
                    title={country.name}
                  />
                }
              />
            ))}
          </ul>
        </VisitorDestinationSection>
      ) : null}

      {hasCities ? (
        <VisitorDestinationSection
          title={labels.citiesTitle}
          countLabel={labels.citiesCount}
          showLabel={labels.show}
          viewAllHref={`${allHref}#profile-all-cities`}
          viewAllLabel={labels.viewAll}
        >
          <ul className="profile-next-route-list">
            {destinations.cities.map((city) => (
              <ProfileVisitorDestinationRow
                key={city.id}
                countryCode={city.countryCode}
                subtitle={city.countryName}
                titleNode={
                  <ProfileCityLink
                    slug={city.citySlug}
                    name={city.placeName}
                    className="profile-next-route-name profile-next-route-link"
                    title={city.placeName}
                  />
                }
              />
            ))}
          </ul>
        </VisitorDestinationSection>
      ) : null}

      {hasParks ? (
        <VisitorDestinationSection
          title={labels.parksTitle}
          countLabel={labels.parksCount}
          showLabel={labels.show}
          viewAllHref={`${allHref}#profile-all-parks`}
          viewAllLabel={labels.viewAll}
        >
          <ul className="profile-next-route-list">
            {destinations.parks.map((park) => (
              <ProfileVisitorDestinationRow
                key={park.id}
                countryCode={park.countryCode}
                subtitle={park.countryName}
                titleNode={
                  <ProfileParkLink
                    slug={park.parkSlug}
                    name={park.parkName}
                    className="profile-next-route-name profile-next-route-link"
                    title={park.parkName}
                  />
                }
              />
            ))}
          </ul>
        </VisitorDestinationSection>
      ) : null}
    </div>
  );
}
