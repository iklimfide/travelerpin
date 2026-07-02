"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ProfileDestinationEditModal } from "@/components/profile/ProfileDestinationEditModal";
import { ProfileMapPanel } from "@/components/profile/ProfileMapPanel";
import { ProfileCountryDestinationCard } from "@/components/profile/ProfileCountryDestinationCard";
import { ProfileDestinationCardActions } from "@/components/profile/ProfileDestinationCardActions";
import { ProfileParkDestinationCard } from "@/components/profile/ProfileParkDestinationCard";
import { ProfileTripCard } from "@/components/profile/ProfileTripCard";
import { ProfileWishlistDestinationCard } from "@/components/profile/ProfileWishlistDestinationCard";
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";
import {
  commonMessages,
  countryMessages,
  formatMessage,
  modalMessages,
  profileDestinationCityCountLabel,
  profileDestinationParkCountLabel,
  profileMessages,
  profileVisitCountLabel,
  saveDestinationMessages,
} from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";
import {
  countryHasMappedPlaces,
  isCountryRemoveBlockedByPlacesError,
} from "@/lib/utils/country-remove";
import type { ProfileAllDestinations } from "@/lib/utils/profile-all-destinations";
import type { ProfileTrip } from "@/lib/utils/profile-page";
import type { TravelStats, VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";

type ProfileAllDestinationsViewProps = {
  username: string;
  displayName: string;
  isOwnProfile: boolean;
  destinations: ProfileAllDestinations;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  visitedCodes: string[];
  wishlistCodes: string[];
  wishlistCountries: WishlistCountry[];
  isLoggedIn: boolean;
  stats: TravelStats;
};

function DestinationSection({
  title,
  count,
  showHead = true,
  children,
}: {
  title: string;
  count: number;
  showHead?: boolean;
  children: ReactNode;
}) {
  if (count === 0) return null;

  return (
    <section className="profile-all-section">
      {showHead ? (
        <div className="profile-section-head">
          <h2 className="profile-section-title">{title}</h2>
          <span className="profile-all-section__count">{count}</span>
        </div>
      ) : null}
      <div className="profile-all-grid" role="list" aria-label={title}>
        {children}
      </div>
    </section>
  );
}

type ProfileAllTab = "countries" | "cities" | "parks" | "wishlist";

const PROFILE_ALL_TABS: { id: ProfileAllTab; label: string; icon: string }[] = [
  { id: "countries", label: saveDestinationMessages.tabCountries, icon: "🌍" },
  { id: "cities", label: saveDestinationMessages.tabCities, icon: "📍" },
  { id: "parks", label: saveDestinationMessages.tabParks, icon: "🏞️" },
  { id: "wishlist", label: saveDestinationMessages.tabWishlist, icon: "⭐" },
];

function ProfileAllDestinationsNav({
  displayName,
  isOwnProfile,
  activeTab,
  onTabChange,
}: {
  displayName: string;
  isOwnProfile: boolean;
  activeTab: ProfileAllTab;
  onTabChange: (tab: ProfileAllTab) => void;
}) {
  const visitedLabel = isOwnProfile
    ? profileMessages.allDestinationsVisitedPrefixOwn
    : formatMessage(profileMessages.allDestinationsVisitedPrefixVisitor, { name: displayName });

  return (
    <div className="profile-all-nav">
      <h2 className="profile-all-nav__title">{visitedLabel}</h2>
      <div className="profile-all-tabs" role="tablist" aria-label="Destination categories">
        {PROFILE_ALL_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeTab === item.id}
            className={`profile-all-tabs__tab${activeTab === item.id ? " profile-all-tabs__tab--active" : ""}`}
            onClick={() => onTabChange(item.id)}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProfileAllDestinationsView({
  username,
  displayName,
  isOwnProfile,
  destinations,
  visitedCountries,
  visitedCities,
  visitedParks,
  visitedCodes,
  wishlistCodes,
  wishlistCountries,
  isLoggedIn,
  stats,
}: ProfileAllDestinationsViewProps) {
  const router = useRouter();
  const modal = useModal();
  const toast = useToast();
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [editingParkId, setEditingParkId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileAllTab>("countries");

  const title = isOwnProfile
    ? profileMessages.allDestinationsTitle
    : formatMessage(profileMessages.allDestinationsTitleVisitor, { name: displayName });

  const badgeLabels: Record<NonNullable<ProfileTrip["badge"]>, string> = {
    recent: profileMessages.tripBadgeRecent,
    favorite: profileMessages.tripBadgeFavorite,
    dayTrip: profileMessages.tripBadgeDayTrip,
  };

  const totalCount =
    destinations.countries.length +
    destinations.cities.length +
    destinations.parks.length +
    destinations.wishlist.length;

  const hasMapContent =
    visitedCountries.length > 0 ||
    visitedCities.length > 0 ||
    visitedParks.length > 0 ||
    wishlistCodes.length > 0;

  const mapTitle = profileMessages.worldMapTitleShort;

  const editingCity = visitedCities.find((city) => city.id === editingCityId);
  const editingPark = visitedParks.find((park) => park.id === editingParkId);

  async function handleDeleteCity(id: string) {
    const confirmed = await modal.confirm(modalMessages.deleteCityMessage, {
      title: modalMessages.deleteCityTitle,
      destructive: true,
    });
    if (!confirmed) return;

    const res = await fetch(`/api/cities/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      await modal.alert(data.error ?? "Failed to delete city", { variant: "error" });
      return;
    }
    router.refresh();
  }

  async function handleDeletePark(id: string) {
    const confirmed = await modal.confirm(modalMessages.deleteParkMessage, {
      title: modalMessages.deleteParkTitle,
      destructive: true,
    });
    if (!confirmed) return;

    const res = await fetch(`/api/parks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      await modal.alert(data.error ?? "Failed to delete park", { variant: "error" });
      return;
    }
    router.refresh();
  }

  async function handleRemoveCountry(country: ProfileAllDestinations["countries"][number]) {
    const blockedByPlaces =
      country.cityCount > 0 ||
      country.parkCount > 0 ||
      country.visitedViaPlacesOnly ||
      countryHasMappedPlaces(country.code, visitedCities, visitedParks);

    if (blockedByPlaces) {
      toast.show(countryMessages.removePlacesFirst);
      return;
    }
    if (!country.visitedId) return;

    const confirmed = await modal.confirm(modalMessages.deleteCountryMessage, {
      title: modalMessages.deleteCountryTitle,
      destructive: true,
    });
    if (!confirmed) return;

    const res = await fetch(`/api/countries/${country.visitedId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      if (isCountryRemoveBlockedByPlacesError(data.error)) {
        toast.show(countryMessages.removePlacesFirst);
        return;
      }
      await modal.alert(data.error ?? "Failed to remove country", { variant: "error" });
      return;
    }
    router.refresh();
  }

  async function handleRemoveWishlist(id: string) {
    const confirmed = await modal.confirm(modalMessages.deleteWishlistCountryMessage, {
      title: modalMessages.deleteWishlistCountryTitle,
      destructive: true,
    });
    if (!confirmed) return;

    const res = await fetch(`/api/wishlist/countries/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      await modal.alert(data.error ?? "Failed to remove from wishlist", { variant: "error" });
      return;
    }
    router.refresh();
  }

  const visitedContentCount =
    destinations.countries.length + destinations.cities.length + destinations.parks.length;

  const hasNavContent = visitedContentCount > 0 || destinations.wishlist.length > 0;

  const showCountries = activeTab === "countries";
  const showCities = activeTab === "cities";
  const showParks = activeTab === "parks";
  const showWishlist = activeTab === "wishlist";

  const tabContentCount =
    (showCountries ? destinations.countries.length : 0) +
    (showCities ? destinations.cities.length : 0) +
    (showParks ? destinations.parks.length : 0) +
    (showWishlist ? destinations.wishlist.length : 0);

  const ownerActions = isOwnProfile
    ? {
        editLabel: commonMessages.edit,
        removeLabel: commonMessages.delete,
      }
    : null;

  return (
    <div className="profile-page profile-all-page">
      <div className="profile-shell">
        <div className="profile-all-header">
          <Link href={profilePath(username)} className="profile-all-back">
            ← {profileMessages.allDestinationsBack}
          </Link>
          <h1 className="profile-all-title">{title}</h1>
        </div>

        {hasMapContent ? (
          <div className="profile-all-map">
            <ProfileMapPanel
              visitedCountryCodes={visitedCodes}
              wishlistCountryCodes={wishlistCodes}
              visitedCountries={visitedCountries}
              wishlistCountries={wishlistCountries}
              visitedCities={visitedCities}
              visitedParks={visitedParks}
              isLoggedIn={isLoggedIn}
              canEditMap={isOwnProfile}
              countryCount={stats.countries}
              title={mapTitle}
              exploredBadgeLabel={profileMessages.mapExploredBadge}
            />
          </div>
        ) : null}

        {totalCount === 0 ? (
          <p className="profile-empty">{profileMessages.allDestinationsEmpty}</p>
        ) : (
          <main className="profile-all-main">
            {hasNavContent ? (
              <ProfileAllDestinationsNav
                displayName={displayName}
                isOwnProfile={isOwnProfile}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            ) : null}

            {tabContentCount === 0 ? (
              <p className="profile-empty">{profileMessages.allDestinationsTabEmpty}</p>
            ) : null}

            {showCountries ? (
            <DestinationSection
              title={profileMessages.allDestinationsCountries}
              count={destinations.countries.length}
              showHead={false}
            >
              {destinations.countries.map((country) => (
                <ProfileCountryDestinationCard
                  key={country.code}
                  country={country}
                  cityCountLabel={profileDestinationCityCountLabel}
                  parkCountLabel={profileDestinationParkCountLabel}
                  actions={
                    ownerActions ? (
                      <ProfileDestinationCardActions
                        removeLabel={ownerActions.removeLabel}
                        editLabel={ownerActions.editLabel}
                        onRemove={() => handleRemoveCountry(country)}
                      />
                    ) : null
                  }
                />
              ))}
            </DestinationSection>
            ) : null}

            {showCities ? (
            <DestinationSection
              title={profileMessages.allDestinationsCities}
              count={destinations.cities.length}
              showHead={false}
            >
              {destinations.cities.map((trip) => (
                <ProfileTripCard
                  key={trip.id}
                  trip={trip}
                  badgeLabels={badgeLabels}
                  visitCountLabel={profileVisitCountLabel}
                  emptyNote={profileMessages.tripDefaultNote}
                  layout="grid"
                  actions={
                    ownerActions ? (
                      <ProfileDestinationCardActions
                        editLabel={ownerActions.editLabel}
                        removeLabel={ownerActions.removeLabel}
                        onEdit={() => {
                          setEditingParkId(null);
                          setEditingCityId(trip.id);
                        }}
                        onRemove={() => handleDeleteCity(trip.id)}
                      />
                    ) : null
                  }
                />
              ))}
            </DestinationSection>
            ) : null}

            {showParks ? (
            <DestinationSection
              title={profileMessages.allDestinationsParks}
              count={destinations.parks.length}
              showHead={false}
            >
              {destinations.parks.map((park) => (
                <ProfileParkDestinationCard
                  key={park.id}
                  park={park}
                  emptyNote={profileMessages.tripDefaultNote}
                  actions={
                    ownerActions ? (
                      <ProfileDestinationCardActions
                        editLabel={ownerActions.editLabel}
                        removeLabel={ownerActions.removeLabel}
                        onEdit={() => {
                          setEditingCityId(null);
                          setEditingParkId(park.id);
                        }}
                        onRemove={() => handleDeletePark(park.id)}
                      />
                    ) : null
                  }
                />
              ))}
            </DestinationSection>
            ) : null}

            {showWishlist ? (
            <DestinationSection
              title={profileMessages.wishlistCountries}
              count={destinations.wishlist.length}
              showHead={false}
            >
              {destinations.wishlist.map((country) => (
                <ProfileWishlistDestinationCard
                  key={country.id}
                  country={country}
                  wantLabel={profileMessages.wantsToVisit}
                  actions={
                    ownerActions ? (
                      <ProfileDestinationCardActions
                        removeLabel={ownerActions.removeLabel}
                        editLabel={ownerActions.editLabel}
                        onRemove={() => handleRemoveWishlist(country.id)}
                      />
                    ) : null
                  }
                />
              ))}
            </DestinationSection>
            ) : null}
          </main>
        )}
      </div>

      <ProfileDestinationEditModal
        city={editingCity ?? null}
        park={editingPark ?? null}
        visitedCountries={visitedCountries}
        onClose={() => {
          setEditingCityId(null);
          setEditingParkId(null);
        }}
      />
    </div>
  );
}
