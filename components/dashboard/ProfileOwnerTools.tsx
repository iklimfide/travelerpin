"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CountryManager } from "@/components/dashboard/CountryManager";
import { CityList } from "@/components/dashboard/CityList";
import { ParkList } from "@/components/dashboard/ParkList";
import { useDashboardAdd } from "@/components/dashboard/DashboardAddProvider";
import {
  ProfileOwnerSection,
  type ProfileOwnerPanelMode,
} from "@/components/profile/ProfileOwnerSection";
import { profileMessages, translateCity } from "@/lib/i18n/client-messages";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { parkTypeLabel } from "@/lib/utils/park-type";
import { formatVisitDatesSummary } from "@/lib/utils/visit-date";
import { getIntlLocale } from "@/lib/i18n/config";
import type { VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";

type ProfileOwnerToolsProps = {
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  wishlistCountries: WishlistCountry[];
  visitedCodes: string[];
};

function scrollToMap() {
  document.getElementById("profile-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function ProfileOwnerTools({
  visitedCountries,
  visitedCities,
  visitedParks,
  wishlistCountries,
  visitedCodes,
}: ProfileOwnerToolsProps) {
  const { openAddModal } = useDashboardAdd();
  const [countriesPanel, setCountriesPanel] = useState<ProfileOwnerPanelMode>("closed");
  const [citiesPanel, setCitiesPanel] = useState<ProfileOwnerPanelMode>("closed");
  const [parksPanel, setParksPanel] = useState<ProfileOwnerPanelMode>("closed");

  const countryShowRows = useMemo(() => {
    const names = new Map<string, string>();
    for (const country of visitedCountries) {
      names.set(country.country_code.toUpperCase(), country.country_name);
    }
    for (const city of visitedCities) {
      names.set(city.country_code.toUpperCase(), city.country_name);
    }
    for (const park of visitedParks) {
      names.set(park.country_code.toUpperCase(), park.country_name);
    }

    return visitedCodes
      .map((code) => ({
        code: code.toUpperCase(),
        name: names.get(code.toUpperCase()) ?? code,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [visitedCodes, visitedCountries, visitedCities, visitedParks]);

  const wishlistShowRows = useMemo(
    () =>
      [...wishlistCountries].sort((a, b) =>
        a.country_name.localeCompare(b.country_name, undefined, { sensitivity: "base" })
      ),
    [wishlistCountries]
  );

  const sortedCities = useMemo(
    () =>
      [...visitedCities].sort((a, b) => {
        const byCountry = a.country_name.localeCompare(b.country_name, undefined, {
          sensitivity: "base",
        });
        if (byCountry !== 0) return byCountry;
        return a.city_name.localeCompare(b.city_name, undefined, { sensitivity: "base" });
      }),
    [visitedCities]
  );

  const sortedParks = useMemo(
    () =>
      [...visitedParks].sort((a, b) => {
        const byCountry = a.country_name.localeCompare(b.country_name, undefined, {
          sensitivity: "base",
        });
        if (byCountry !== 0) return byCountry;
        return a.park_name.localeCompare(b.park_name, undefined, { sensitivity: "base" });
      }),
    [visitedParks]
  );

  return (
    <div id="dashboard-add" className="profile-dashboard-add-anchor profile-owner-tools">
      <ProfileOwnerSection
        title={profileMessages.myCountries}
        countLabel={profileMessages.ownerCountCountries.replace(
          "{count}",
          String(countryShowRows.length)
        )}
        panel={countriesPanel}
        onPanelChange={setCountriesPanel}
        onAdd={() => openAddModal("countries")}
        showContent={
          countryShowRows.length === 0 && wishlistShowRows.length === 0 ? (
            <p className="profile-owner-empty">{profileMessages.ownerEmptyCountries}</p>
          ) : (
            <>
              {countryShowRows.length > 0 ? (
                <ul className="profile-owner-show-list">
                  {countryShowRows.map((country) => (
                    <li key={country.code} className="profile-owner-show-item">
                      <Image
                        src={countryCodeToFlagUrl(country.code)}
                        alt=""
                        width={22}
                        height={22}
                        className="rounded-full object-cover"
                      />
                      <span>{country.name}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {wishlistShowRows.length > 0 ? (
                <div className="profile-owner-show-group">
                  <p className="profile-owner-show-label">{profileMessages.wishlistCountries}</p>
                  <ul className="profile-owner-show-list">
                    {wishlistShowRows.map((country) => (
                      <li key={country.id} className="profile-owner-show-item profile-owner-show-item--wishlist">
                        <Image
                          src={countryCodeToFlagUrl(country.country_code)}
                          alt=""
                          width={22}
                          height={22}
                          className="rounded-full object-cover"
                        />
                        <span>{country.country_name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <button type="button" className="profile-owner-map-link" onClick={scrollToMap}>
                {profileMessages.ownerViewOnMap}
              </button>
            </>
          )
        }
        editContent={
          <CountryManager
            embedded
            visitedCountries={visitedCountries}
            wishlistCountries={wishlistCountries}
            visitedCountryCodes={visitedCodes}
            visitedCities={visitedCities}
            visitedParks={visitedParks}
          />
        }
      />

      <ProfileOwnerSection
        title={profileMessages.myCities}
        countLabel={profileMessages.ownerCountCities.replace("{count}", String(visitedCities.length))}
        panel={citiesPanel}
        onPanelChange={setCitiesPanel}
        onAdd={() => openAddModal("cities")}
        showContent={
          sortedCities.length === 0 ? (
            <p className="profile-owner-empty">{profileMessages.ownerEmptyCities}</p>
          ) : (
            <>
              <ul className="profile-owner-show-list">
                {sortedCities.map((city) => {
                  const visitSummary = formatVisitDatesSummary(
                    city.visit_dates ?? [],
                    (count) => translateCity("visitCount", { count }),
                    getIntlLocale()
                  );

                  return (
                    <li key={city.id} className="profile-owner-show-item profile-owner-show-item--stacked">
                      <div>
                        <p className="profile-owner-show-primary">
                          {city.city_name}
                          <span className="profile-owner-show-secondary">, {city.country_name}</span>
                        </p>
                        {visitSummary ? (
                          <p className="profile-owner-show-meta">{visitSummary}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="profile-owner-map-link" onClick={scrollToMap}>
                {profileMessages.ownerViewOnMap}
              </button>
            </>
          )
        }
        editContent={<CityList embedded cities={visitedCities} countries={visitedCountries} />}
      />

      <ProfileOwnerSection
        title={profileMessages.myParks}
        countLabel={profileMessages.ownerCountParks.replace("{count}", String(visitedParks.length))}
        panel={parksPanel}
        onPanelChange={setParksPanel}
        onAdd={() => openAddModal("parks")}
        showContent={
          sortedParks.length === 0 ? (
            <p className="profile-owner-empty">{profileMessages.ownerEmptyParks}</p>
          ) : (
            <>
              <ul className="profile-owner-show-list">
                {sortedParks.map((park) => (
                  <li key={park.id} className="profile-owner-show-item profile-owner-show-item--stacked">
                    <div>
                      <p className="profile-owner-show-primary">
                        {formatCityDisplayName(park.park_name)}
                        <span className="profile-owner-show-secondary">, {park.country_name}</span>
                      </p>
                      <p className="profile-owner-show-meta">{parkTypeLabel(park.park_type)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" className="profile-owner-map-link" onClick={scrollToMap}>
                {profileMessages.ownerViewOnMap}
              </button>
            </>
          )
        }
        editContent={<ParkList embedded parks={visitedParks} countries={visitedCountries} />}
      />
    </div>
  );
}
