"use client";

import Link from "next/link";
import { TravelMapView } from "@/components/map/TravelMapView";
import { VisitedCountryFlags } from "@/components/map/VisitedCountryFlags";
import { worldCoveragePercent } from "@/lib/utils/profile-page";
import type { VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";

type ProfileMapPanelProps = {
  visitedCountryCodes: string[];
  wishlistCountryCodes: string[];
  visitedCountries: VisitedCountry[];
  wishlistCountries: WishlistCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  isLoggedIn: boolean;
  canEditMap: boolean;
  countryCount: number;
  /** When omitted, the map section has no heading (page already shows the title). */
  title?: string;
  exploredBadgeLabel: string;
  detailLabel?: string;
  detailHref?: string;
  /** Whole map + flags panel links here (e.g. profile /all). */
  allHref?: string;
  allAriaLabel?: string;
};

export function ProfileMapPanel({
  visitedCountryCodes,
  wishlistCountryCodes,
  visitedCountries,
  wishlistCountries,
  visitedCities,
  visitedParks,
  isLoggedIn,
  canEditMap,
  countryCount,
  title,
  exploredBadgeLabel,
  detailLabel,
  detailHref = "#travel-map",
  allHref,
  allAriaLabel,
}: ProfileMapPanelProps) {
  const coverage = worldCoveragePercent(countryCount);
  const showHead = Boolean(title || detailLabel);

  const panel = (
    <>
      <div className="profile-mini-map">
        <TravelMapView
          visitedCountryCodes={visitedCountryCodes}
          wishlistCountryCodes={wishlistCountryCodes}
          visitedCountries={visitedCountries}
          wishlistCountries={wishlistCountries}
          userCities={visitedCities}
          userParks={visitedParks}
          citiesCountryCodes={[
            ...new Set(visitedCities.map((c) => c.country_code.toUpperCase())),
          ]}
          parksCountryCodes={[
            ...new Set(visitedParks.map((p) => p.country_code.toUpperCase())),
          ]}
          isLoggedIn={isLoggedIn}
          canEditMap={canEditMap}
          interactive={false}
          showContinentFilter={false}
          compactProfile
        />
        <div className="profile-map-badge" aria-label={`${coverage}% ${exploredBadgeLabel}`}>
          <strong>{coverage}%</strong>
          <span>{exploredBadgeLabel}</span>
        </div>
      </div>

      <VisitedCountryFlags
        visitedCountries={visitedCountries}
        userCities={visitedCities}
        userParks={visitedParks}
        countryCodes={visitedCountryCodes}
        variant="landing"
        disableCountryLinks={Boolean(allHref)}
        className="border-t border-[#d8e1ef] !px-4 !py-3"
      />
    </>
  );

  return (
    <section id="profile-map" className="profile-section">
      {showHead ? (
        <div className="profile-section-head">
          {title ? <h2 className="profile-section-title">{title}</h2> : <span />}
          {detailLabel ? (
            <a href={detailHref} className="profile-see-all">
              {detailLabel}
            </a>
          ) : null}
        </div>
      ) : null}

      {allHref ? (
        <Link
          href={allHref}
          className="profile-map-panel profile-map-panel--link"
          aria-label={allAriaLabel}
        >
          {panel}
        </Link>
      ) : (
        <div className="profile-map-panel">{panel}</div>
      )}
    </section>
  );
}
