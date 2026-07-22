"use client";

import dynamic from "next/dynamic";
import { Link } from "@/lib/i18n/navigation";
import { useEffect, useState } from "react";
import { VisitedCountryFlags } from "@/components/map/VisitedCountryFlags";
import { DEMO_VISITED_COUNTRIES, DEMO_VISITED_COUNTRY_CODES } from "@/lib/data/demo-countries";
import { DEMO_WISHLIST_COUNTRY_CODES } from "@/lib/data/demo-wishlist";
import {
  SHARE_MAP_SHOWCASE_END_EVENT,
  SHARE_MAP_SHOWCASE_START_EVENT,
} from "@/lib/client/share-map-showcase";
import { useAnimatedCount } from "@/lib/hooks/useAnimatedCount";
import { worldCoveragePercent } from "@/lib/utils/profile-page";
import type { VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";

/** Map chunk is heavy (d3/topojson) — keep it off the critical profile paint path. */
const TravelMapView = dynamic(
  () =>
    import("@/components/map/TravelMapView").then((mod) => mod.TravelMapView),
  {
    ssr: false,
    loading: () => (
      <div id="travel-map" aria-hidden>
        <div />
      </div>
    ),
  }
);

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
  /** Animate the explored % badge from zero (homepage demo). */
  animateCountryCount?: boolean;
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
  animateCountryCount = false,
}: ProfileMapPanelProps) {
  const displayCountryCount = useAnimatedCount(countryCount, animateCountryCount);
  const coverage = worldCoveragePercent(displayCountryCount);
  const showHead = Boolean(title || detailLabel);
  const [shareShowcaseMap, setShareShowcaseMap] = useState(false);

  useEffect(() => {
    // Share-card PNG capture: temporarily paint Jennifer's denser sample map fill.
    function onStart() {
      setShareShowcaseMap(true);
    }
    function onEnd() {
      setShareShowcaseMap(false);
    }

    window.addEventListener(SHARE_MAP_SHOWCASE_START_EVENT, onStart);
    window.addEventListener(SHARE_MAP_SHOWCASE_END_EVENT, onEnd);
    return () => {
      window.removeEventListener(SHARE_MAP_SHOWCASE_START_EVENT, onStart);
      window.removeEventListener(SHARE_MAP_SHOWCASE_END_EVENT, onEnd);
    };
  }, []);

  const panel = (
    <>
      <div
        className="profile-mini-map"
        data-share-map-showcase={shareShowcaseMap ? "1" : undefined}
      >
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
          shareFillCountryCodes={
            shareShowcaseMap ? [...DEMO_VISITED_COUNTRY_CODES] : null
          }
          shareFillWishlistCountryCodes={
            shareShowcaseMap ? [...DEMO_WISHLIST_COUNTRY_CODES] : null
          }
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
        visitedCountries={shareShowcaseMap ? DEMO_VISITED_COUNTRIES : visitedCountries}
        userCities={shareShowcaseMap ? [] : visitedCities}
        userParks={shareShowcaseMap ? [] : visitedParks}
        countryCodes={
          shareShowcaseMap ? [...DEMO_VISITED_COUNTRY_CODES] : visitedCountryCodes
        }
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
