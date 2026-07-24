"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { getCountryName } from "@/lib/data/countries";
import { useAppMessages } from "@/lib/i18n/client-messages";
import type { ProfileTrip } from "@/lib/utils/profile-page";

export const PROFILE_MODAL_ALL_COUNTRIES = "ALL";

type ProfileDestinationsModalCountryFilterProps = {
  cities: ProfileTrip[];
  value: string;
  onChange: (countryCode: string) => void;
};

export function useProfileCityModalCountryFilter(cities: ProfileTrip[]) {
  const locale = useLocale() === "tr" ? "tr" : "en";

  const countryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const trip of cities) {
      const code = trip.countryCode.toUpperCase();
      if (!map.has(code)) {
        map.set(code, getCountryName(code, locale));
      }
    }
    return [...map.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, locale === "tr" ? "tr" : "en", { sensitivity: "base" })
      );
  }, [cities, locale]);

  const filterCities = (countryFilter: string, list: ProfileTrip[]): ProfileTrip[] => {
    if (countryFilter === PROFILE_MODAL_ALL_COUNTRIES) return list;
    const code = countryFilter.toUpperCase();
    return list.filter((trip) => trip.countryCode.toUpperCase() === code);
  };

  return { countryOptions, filterCities };
}

export function ProfileDestinationsModalCountryFilter({
  cities,
  value,
  onChange,
}: ProfileDestinationsModalCountryFilterProps) {
  const { city: cityMessages } = useAppMessages();
  const { countryOptions } = useProfileCityModalCountryFilter(cities);

  if (countryOptions.length <= 1) return null;

  return (
    <div className="profile-all-destinations-modal__filter">
      <label className="profile-all-destinations-modal__filter-label" htmlFor="profile-cities-country-filter">
        {cityMessages.filterByCountry}
      </label>
      <select
        id="profile-cities-country-filter"
        className="profile-all-destinations-modal__filter-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value={PROFILE_MODAL_ALL_COUNTRIES}>{cityMessages.allCountries}</option>
        {countryOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}
