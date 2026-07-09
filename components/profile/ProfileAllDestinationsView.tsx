"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ProfileAllDestinationsListModal } from "@/components/profile/ProfileAllDestinationsListModal";
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
  saveDestinationMessages,
} from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";
import {
  countryHasMappedPlaces,
  isCountryRemoveBlockedByPlacesError,
} from "@/lib/utils/country-remove";
import { findCountryBackingCity } from "@/lib/utils/country-pin";
import type { ProfileAllDestinations } from "@/lib/utils/profile-all-destinations";
import type { ProfileTrip } from "@/lib/utils/profile-page";
import type { TravelStats, VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";

/** Preview grid: 2 columns × 3 rows. */
const PREVIEW_LIMIT = 6;

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

type ProfileAllTab = "countries" | "cities" | "parks" | "wishlist";

const PROFILE_ALL_TABS: { id: ProfileAllTab; label: string; icon: string }[] = [
  { id: "countries", label: saveDestinationMessages.tabCountries, icon: "🌍" },
  { id: "cities", label: saveDestinationMessages.tabCities, icon: "📍" },
  { id: "parks", label: saveDestinationMessages.tabParks, icon: "🏞️" },
  { id: "wishlist", label: saveDestinationMessages.tabWishlist, icon: "⭐" },
];

const MODAL_TITLES: Record<ProfileAllTab, string> = {
  countries: profileMessages.allDestinationsCountries,
  cities: profileMessages.allDestinationsCities,
  parks: profileMessages.allDestinationsParks,
  wishlist: profileMessages.wishlistCountries,
};

function sectionId(tab: ProfileAllTab): string {
  return `profile-all-${tab}`;
}

type OwnerActions = {
  editLabel: string;
  removeLabel: string;
} | null;

function DestinationSection({
  id,
  title,
  count,
  onOpenAll,
  children,
}: {
  id: string;
  title: string;
  count: number;
  onOpenAll: () => void;
  children: ReactNode;
}) {
  const showAllButton = count > PREVIEW_LIMIT;

  return (
    <section id={id} className="profile-all-section profile-all-box">
      <div className="profile-all-box__head">
        <div className="profile-all-box__title-row">
          <h2 className="profile-all-box__title">{title}</h2>
          <span className="profile-all-section__count">{count}</span>
        </div>
        {showAllButton ? (
          <button type="button" className="profile-all-box__all" onClick={onOpenAll}>
            {profileMessages.allDestinationsAll}
          </button>
        ) : null}
      </div>
      {count === 0 ? (
        <p className="profile-all-box__empty">{profileMessages.allDestinationsTabEmpty}</p>
      ) : (
        <div className="profile-all-grid profile-all-grid--preview" role="list" aria-label={title}>
          {children}
        </div>
      )}
    </section>
  );
}

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
  const [editingCountryCode, setEditingCountryCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileAllTab>("countries");
  const [openModalTab, setOpenModalTab] = useState<ProfileAllTab | null>(null);

  const title = formatMessage(profileMessages.allDestinationsTitle, { name: displayName });

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

  const editingCity = visitedCities.find((city) => city.id === editingCityId);
  const editingPark = visitedParks.find((park) => park.id === editingParkId);
  const editingCountryBackingCity = editingCountryCode
    ? findCountryBackingCity(editingCountryCode, visitedCities)
    : null;
  const isEditingDestination = Boolean(editingCityId || editingParkId || editingCountryCode);

  function handleTabChange(tab: ProfileAllTab) {
    setActiveTab(tab);
    document.getElementById(sectionId(tab))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function previewItems<T>(items: T[]): T[] {
    return items.slice(0, PREVIEW_LIMIT);
  }

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

  const hasNavContent = totalCount > 0;

  const ownerActions: OwnerActions = isOwnProfile
    ? {
        editLabel: commonMessages.edit,
        removeLabel: commonMessages.delete,
      }
    : null;

  const countriesPreview = previewItems(destinations.countries);
  const citiesPreview = previewItems(destinations.cities);
  const parksPreview = previewItems(destinations.parks);
  const wishlistPreview = previewItems(destinations.wishlist);

  function renderCountryCards(items: ProfileAllDestinations["countries"]) {
    return items.map((country) => (
      <ProfileCountryDestinationCard
        key={country.code}
        country={country}
        cityCountLabel={profileDestinationCityCountLabel}
        parkCountLabel={profileDestinationParkCountLabel}
        actions={
          ownerActions ? (
            <ProfileDestinationCardActions
              editLabel={ownerActions.editLabel}
              removeLabel={ownerActions.removeLabel}
              onEdit={() => {
                setEditingCityId(null);
                setEditingParkId(null);
                setEditingCountryCode(country.code);
              }}
              onRemove={() => handleRemoveCountry(country)}
            />
          ) : null
        }
      />
    ));
  }

  function renderCityCards(items: ProfileAllDestinations["cities"]) {
    return items.map((trip) => (
      <ProfileTripCard
        key={trip.id}
        trip={trip}
        badgeLabels={badgeLabels}
        layout="grid"
        actions={
          ownerActions ? (
            <ProfileDestinationCardActions
              editLabel={ownerActions.editLabel}
              removeLabel={ownerActions.removeLabel}
              onEdit={() => {
                setEditingParkId(null);
                setEditingCountryCode(null);
                setEditingCityId(trip.id);
              }}
              onRemove={() => handleDeleteCity(trip.id)}
            />
          ) : null
        }
      />
    ));
  }

  function renderParkCards(items: ProfileAllDestinations["parks"]) {
    return items.map((park) => (
      <ProfileParkDestinationCard
        key={park.id}
        park={park}
        actions={
          ownerActions ? (
            <ProfileDestinationCardActions
              editLabel={ownerActions.editLabel}
              removeLabel={ownerActions.removeLabel}
              onEdit={() => {
                setEditingCityId(null);
                setEditingCountryCode(null);
                setEditingParkId(park.id);
              }}
              onRemove={() => handleDeletePark(park.id)}
            />
          ) : null
        }
      />
    ));
  }

  function renderWishlistCards(items: ProfileAllDestinations["wishlist"]) {
    return items.map((country) => (
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
    ));
  }

  function renderModalItems(tab: ProfileAllTab) {
    switch (tab) {
      case "countries":
        return renderCountryCards(destinations.countries);
      case "cities":
        return renderCityCards(destinations.cities);
      case "parks":
        return renderParkCards(destinations.parks);
      case "wishlist":
        return renderWishlistCards(destinations.wishlist);
    }
  }

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
                onTabChange={handleTabChange}
              />
            ) : null}

            <DestinationSection
              id={sectionId("countries")}
              title={profileMessages.allDestinationsCountries}
              count={destinations.countries.length}
              onOpenAll={() => setOpenModalTab("countries")}
            >
              {renderCountryCards(countriesPreview)}
            </DestinationSection>

            <DestinationSection
              id={sectionId("cities")}
              title={profileMessages.allDestinationsCities}
              count={destinations.cities.length}
              onOpenAll={() => setOpenModalTab("cities")}
            >
              {renderCityCards(citiesPreview)}
            </DestinationSection>

            <DestinationSection
              id={sectionId("parks")}
              title={profileMessages.allDestinationsParks}
              count={destinations.parks.length}
              onOpenAll={() => setOpenModalTab("parks")}
            >
              {renderParkCards(parksPreview)}
            </DestinationSection>

            <DestinationSection
              id={sectionId("wishlist")}
              title={profileMessages.wishlistCountries}
              count={destinations.wishlist.length}
              onOpenAll={() => setOpenModalTab("wishlist")}
            >
              {renderWishlistCards(wishlistPreview)}
            </DestinationSection>
          </main>
        )}
      </div>

      <ProfileAllDestinationsListModal
        open={openModalTab !== null}
        title={openModalTab ? MODAL_TITLES[openModalTab] : ""}
        onClose={() => setOpenModalTab(null)}
        closeOnEscape={!isEditingDestination}
      >
        {openModalTab ? renderModalItems(openModalTab) : null}
      </ProfileAllDestinationsListModal>

      <ProfileDestinationEditModal
        city={editingCity ?? null}
        park={editingPark ?? null}
        countryCode={editingCountryCode}
        countryBackingCity={editingCountryBackingCity}
        visitedCountries={visitedCountries}
        onClose={() => {
          setEditingCityId(null);
          setEditingParkId(null);
          setEditingCountryCode(null);
        }}
      />
    </div>
  );
}
