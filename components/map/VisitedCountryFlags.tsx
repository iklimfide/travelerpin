"use client";

import { Link } from "@/lib/i18n/navigation";
import { useLocale } from "next-intl";
import { useMemo } from "react";
import { getCountryHubByCode } from "@/lib/data/country-hubs";
import { buildVisitedCountryList } from "@/lib/map/travel-lists";
import { countryPath } from "@/lib/seo/site";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

type VisitedCountryFlagsProps = {
  visitedCountries?: VisitedCountry[];
  userCities?: VisitedCity[];
  userParks?: VisitedPark[];
  countryCodes: string[];
  onCountryClick?: (country: { code: string; name: string }) => void;
  /** When true, flags are decorative only (e.g. parent panel is the link). */
  disableCountryLinks?: boolean;
  variant?: "default" | "landing";
  className?: string;
};

function countryHubHref(code: string): string | null {
  const slug = getCountryHubByCode(code)?.slug;
  return slug ? countryPath(slug) : null;
}

function FlagTile({
  country,
  onClick,
  linkHref,
  variant = "default",
}: {
  country: { code: string; name: string };
  onClick?: () => void;
  linkHref?: string | null;
  variant?: "default" | "landing";
}) {
  const shellClass =
    variant === "landing"
      ? "flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#d8e1ef] bg-white sm:h-10 sm:w-10"
      : "flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-700/80 bg-slate-900/70 sm:h-10 sm:w-10";
  const hoverClass =
    variant === "landing"
      ? "hover:border-[#93c5fd] hover:bg-[#f8fbff]"
      : "hover:border-slate-500 hover:bg-slate-800";
  const flag = (
    // eslint-disable-next-line @next/next/no-img-element -- many small lazy-loaded SVG tiles
    <img
      src={countryCodeToFlagUrl(country.code)}
      alt=""
      width={40}
      height={30}
      className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
    />
  );

  if (onClick) {
    return (
      <button
        type="button"
        role="listitem"
        title={country.name}
        aria-label={country.name}
        onClick={onClick}
        className={`${shellClass} transition-colors ${hoverClass}`}
      >
        {flag}
      </button>
    );
  }

  if (linkHref) {
    return (
      <Link
        href={linkHref}
        role="listitem"
        title={country.name}
        aria-label={country.name}
        className={`${shellClass} transition-colors ${hoverClass}`}
      >
        {flag}
      </Link>
    );
  }

  return (
    <span
      role="listitem"
      title={country.name}
      aria-label={country.name}
      className={shellClass}
    >
      {flag}
    </span>
  );
}

export function VisitedCountryFlags({
  visitedCountries = [],
  userCities = [],
  userParks = [],
  countryCodes,
  onCountryClick,
  disableCountryLinks = false,
  variant = "default",
  className = "",
}: VisitedCountryFlagsProps) {
  const locale = useLocale() === "tr" ? "tr" : "en";
  const countries = useMemo(
    () =>
      buildVisitedCountryList(
        visitedCountries,
        userCities,
        countryCodes,
        userParks,
        locale
      ),
    [visitedCountries, userCities, countryCodes, userParks, locale]
  );

  if (countries.length === 0) return null;

  return (
    <div
      className={
        variant === "landing"
          ? `profile-panel-scroll scrollbar-thin ${className}`.trim()
          : `mt-2 max-w-full min-w-0 overflow-x-auto overscroll-x-contain scrollbar-thin sm:mt-3 ${className}`.trim()
      }
    >
      <div
        className={`flex w-max items-center ${
          variant === "landing" ? "gap-2.5" : "gap-1.5 px-0.5 py-1 sm:gap-2"
        }`}
        role="list"
        aria-label="Visited countries"
      >
        {countries.map((country) => (
          <FlagTile
            key={country.code}
            country={country}
            linkHref={
              disableCountryLinks ? null : onCountryClick ? null : countryHubHref(country.code)
            }
            onClick={onCountryClick ? () => onCountryClick(country) : undefined}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}
