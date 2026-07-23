"use client";

import { useState } from "react";
import { ProfileAllDestinationsListModal } from "@/components/profile/ProfileAllDestinationsListModal";
import { ProfileCountryDestinationCard } from "@/components/profile/ProfileCountryDestinationCard";
import { ProfileParkDestinationCard } from "@/components/profile/ProfileParkDestinationCard";
import { ProfileTripCard } from "@/components/profile/ProfileTripCard";
import { ProfileWishlistDestinationCard } from "@/components/profile/ProfileWishlistDestinationCard";
import {
  DestinationSection,
  PREVIEW_LIMIT,
  ProfileVisitedDestinationsNav,
  sectionId,
  type ProfileVisitedTab,
} from "@/components/profile/ProfileVisitedDestinationsSections";
import {
  profileDestinationCityCountLabel,
  profileDestinationParkCountLabel,
  useAppMessages,
} from "@/lib/i18n/client-messages";
import type { ProfileAllDestinations } from "@/lib/utils/profile-all-destinations";
import type { ProfileTrip } from "@/lib/utils/profile-page";

type ProfileTripsRowProps = {
  destinations: ProfileAllDestinations;
  displayName: string;
  isOwnProfile: boolean;
  badgeLabels: Record<NonNullable<ProfileTrip["badge"]>, string>;
};

function previewItems<T>(items: T[]): T[] {
  return items.slice(0, PREVIEW_LIMIT);
}

export function ProfileTripsRow({
  destinations,
  displayName,
  isOwnProfile,
  badgeLabels,
}: ProfileTripsRowProps) {
  const { profile: profileMessages } = useAppMessages();
  const [activeTab, setActiveTab] = useState<ProfileVisitedTab>("countries");
  const [openModalTab, setOpenModalTab] = useState<ProfileVisitedTab | null>(null);

  const totalCount =
    destinations.countries.length +
    destinations.cities.length +
    destinations.parks.length +
    destinations.wishlist.length;

  if (totalCount === 0) return null;

  const modalTitles: Record<ProfileVisitedTab, string> = {
    countries: profileMessages.allDestinationsCountries,
    cities: profileMessages.allDestinationsCities,
    parks: profileMessages.allDestinationsParks,
    wishlist: profileMessages.wishlistCountries,
  };

  function handleTabChange(tab: ProfileVisitedTab) {
    setActiveTab(tab);
    document.getElementById(sectionId(tab))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderModalItems(tab: ProfileVisitedTab) {
    switch (tab) {
      case "countries":
        return destinations.countries.map((country) => (
          <ProfileCountryDestinationCard
            key={country.code}
            country={country}
            cityCountLabel={profileDestinationCityCountLabel}
            parkCountLabel={profileDestinationParkCountLabel}
          />
        ));
      case "cities":
        return destinations.cities.map((trip) => (
          <ProfileTripCard key={trip.id} trip={trip} badgeLabels={badgeLabels} layout="grid" />
        ));
      case "parks":
        return destinations.parks.map((park) => (
          <ProfileParkDestinationCard key={park.id} park={park} />
        ));
      case "wishlist":
        return destinations.wishlist.map((country) => (
          <ProfileWishlistDestinationCard key={country.id} country={country} />
        ));
    }
  }

  const hasNavContent = totalCount > 0;

  return (
    <>
      <section className="profile-section profile-trips-section profile-visited-preview">
        {hasNavContent ? (
          <ProfileVisitedDestinationsNav
            displayName={displayName}
            isOwnProfile={isOwnProfile}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        ) : null}

        <DestinationSection
          id={sectionId("countries")}
          title={profileMessages.allDestinationsCountries}
          count={destinations.countries.length}
          onOpenAll={() => setOpenModalTab("countries")}
        >
          {previewItems(destinations.countries).map((country) => (
            <ProfileCountryDestinationCard
              key={country.code}
              country={country}
              cityCountLabel={profileDestinationCityCountLabel}
              parkCountLabel={profileDestinationParkCountLabel}
            />
          ))}
        </DestinationSection>

        <DestinationSection
          id={sectionId("cities")}
          title={profileMessages.allDestinationsCities}
          count={destinations.cities.length}
          onOpenAll={() => setOpenModalTab("cities")}
        >
          {previewItems(destinations.cities).map((trip) => (
            <ProfileTripCard key={trip.id} trip={trip} badgeLabels={badgeLabels} layout="grid" />
          ))}
        </DestinationSection>

        <DestinationSection
          id={sectionId("parks")}
          title={profileMessages.allDestinationsParks}
          count={destinations.parks.length}
          onOpenAll={() => setOpenModalTab("parks")}
        >
          {previewItems(destinations.parks).map((park) => (
            <ProfileParkDestinationCard key={park.id} park={park} />
          ))}
        </DestinationSection>

        <DestinationSection
          id={sectionId("wishlist")}
          title={profileMessages.wishlistCountries}
          count={destinations.wishlist.length}
          onOpenAll={() => setOpenModalTab("wishlist")}
        >
          {previewItems(destinations.wishlist).map((country) => (
            <ProfileWishlistDestinationCard key={country.id} country={country} />
          ))}
        </DestinationSection>
      </section>

      <ProfileAllDestinationsListModal
        open={openModalTab !== null}
        title={openModalTab ? modalTitles[openModalTab] : ""}
        onClose={() => setOpenModalTab(null)}
      >
        {openModalTab ? renderModalItems(openModalTab) : null}
      </ProfileAllDestinationsListModal>
    </>
  );
}
