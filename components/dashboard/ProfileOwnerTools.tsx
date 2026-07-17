"use client";

import { useCallback, useState } from "react";
import { useAddDestination } from "@/components/add/AddDestinationProvider";
import { CountryManager } from "@/components/dashboard/CountryManager";
import { CityList } from "@/components/dashboard/CityList";
import { ParkList } from "@/components/dashboard/ParkList";
import {
  ProfileOwnerSection,
  type ProfileOwnerPanelMode,
} from "@/components/profile/ProfileOwnerSection";
import { useAppMessages } from "@/lib/i18n/client-messages";
import type { VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";

type ProfileOwnerToolsProps = {
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  wishlistCountries: WishlistCountry[];
  visitedCodes: string[];
};

export function ProfileOwnerTools({
  visitedCountries,
  visitedCities,
  visitedParks,
  wishlistCountries,
  visitedCodes,
}: ProfileOwnerToolsProps) {
  const { profile: profileMessages } = useAppMessages();
  const { open: openAddDestination } = useAddDestination();
  const [countriesPanel, setCountriesPanel] = useState<ProfileOwnerPanelMode>("closed");
  const [citiesPanel, setCitiesPanel] = useState<ProfileOwnerPanelMode>("closed");
  const [parksPanel, setParksPanel] = useState<ProfileOwnerPanelMode>("closed");
  const [citiesCountryFilter, setCitiesCountryFilter] = useState<string | null>(null);

  const visitedCountryCount = visitedCodes.length;

  const openCitiesForCountry = useCallback((countryCode: string) => {
    setCountriesPanel("closed");
    setParksPanel("closed");
    setCitiesCountryFilter(countryCode.toUpperCase());
    setCitiesPanel("edit");
    requestAnimationFrame(() => {
      document.getElementById("dashboard-add")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <div id="dashboard-add" className="profile-dashboard-add-anchor profile-owner-tools">
      <ProfileOwnerSection
        title={profileMessages.myCountries}
        countLabel={profileMessages.ownerCountCountries.replace(
          "{count}",
          String(visitedCountryCount)
        )}
        panel={countriesPanel}
        onPanelChange={setCountriesPanel}
        onAdd={() => openAddDestination("places")}
        editContent={
          <CountryManager
            embedded
            visitedCountries={visitedCountries}
            wishlistCountries={wishlistCountries}
            visitedCountryCodes={visitedCodes}
            visitedCities={visitedCities}
            visitedParks={visitedParks}
            onEditCountryCities={(countryCode) => openCitiesForCountry(countryCode)}
          />
        }
      />

      <ProfileOwnerSection
        title={profileMessages.myCities}
        countLabel={profileMessages.ownerCountCities.replace("{count}", String(visitedCities.length))}
        panel={citiesPanel}
        onPanelChange={(mode) => {
          setCitiesPanel(mode);
          if (mode === "closed") setCitiesCountryFilter(null);
        }}
        onAdd={() => openAddDestination("places")}
        editContent={
          <CityList
            embedded
            cities={visitedCities}
            countries={visitedCountries}
            initialCountryFilter={citiesCountryFilter}
          />
        }
      />

      <ProfileOwnerSection
        title={profileMessages.myParks}
        countLabel={profileMessages.ownerCountParks.replace("{count}", String(visitedParks.length))}
        panel={parksPanel}
        onPanelChange={setParksPanel}
        onAdd={() => openAddDestination("parks")}
        editContent={<ParkList embedded parks={visitedParks} countries={visitedCountries} />}
      />
    </div>
  );
}
