"use client";

import { useState } from "react";
import { CountryManager } from "@/components/dashboard/CountryManager";
import { CityList } from "@/components/dashboard/CityList";
import { ParkList } from "@/components/dashboard/ParkList";
import { useDashboardAdd } from "@/components/dashboard/DashboardAddProvider";
import {
  ProfileOwnerSection,
  type ProfileOwnerPanelMode,
} from "@/components/profile/ProfileOwnerSection";
import { profileMessages } from "@/lib/i18n/client-messages";
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
  const { openAddModal } = useDashboardAdd();
  const [countriesPanel, setCountriesPanel] = useState<ProfileOwnerPanelMode>("closed");
  const [citiesPanel, setCitiesPanel] = useState<ProfileOwnerPanelMode>("closed");
  const [parksPanel, setParksPanel] = useState<ProfileOwnerPanelMode>("closed");

  const visitedCountryCount = visitedCodes.length;

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
        onAdd={() => openAddModal("countries")}
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
        editContent={<CityList embedded cities={visitedCities} countries={visitedCountries} />}
      />

      <ProfileOwnerSection
        title={profileMessages.myParks}
        countLabel={profileMessages.ownerCountParks.replace("{count}", String(visitedParks.length))}
        panel={parksPanel}
        onPanelChange={setParksPanel}
        onAdd={() => openAddModal("parks")}
        editContent={<ParkList embedded parks={visitedParks} countries={visitedCountries} />}
      />
    </div>
  );
}
