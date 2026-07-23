"use client";

import { Link } from "@/lib/i18n/navigation";
import { useCallback, useState } from "react";
import { useLocale } from "next-intl";
import { deleteCitiesBatch } from "@/lib/client/city-actions";
import { removeVisitedCountry, removeWishlistCountry } from "@/lib/client/country-actions";
import { fetchHeroImageMaps } from "@/lib/client/hero-images-cache";
import { deleteParksBatch } from "@/lib/client/park-actions";
import { useProfileStaleReload } from "@/lib/client/use-profile-stale-reload";
import { ProfileAllDestinationsListModal } from "@/components/profile/ProfileAllDestinationsListModal";
import { ProfileDestinationEditModal } from "@/components/profile/ProfileDestinationEditModal";
import { ProfileMapPanel } from "@/components/profile/ProfileMapPanel";
import { ProfileCountryDestinationCard } from "@/components/profile/ProfileCountryDestinationCard";
import { ProfileDestinationCardActions } from "@/components/profile/ProfileDestinationCardActions";
import { ProfileNextRouteSection } from "@/components/profile/ProfileNextRouteSection";
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
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { commonMessages, countryMessages, formatMessage, modalMessages, profileDestinationCityCountLabel, profileDestinationParkCountLabel, profileMessages, saveDestinationMessages, useAppMessages } from "@/lib/i18n/client-messages";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { mapTitleOwnerName } from "@/lib/i18n/turkish-genitive";
import { profilePath } from "@/lib/seo/site";
import {
  applyPublicPreviewToProfileData,
  filterWishlistForProfileView,
  withProfilePublicPreview,
} from "@/lib/profile/public-preview";
import {
  buildProfileAllDestinations,
  type ProfileAllDestinations,
} from "@/lib/utils/profile-all-destinations";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-types";
import {
  countryHasMappedPlaces,
  isCountryRemoveBlockedByPlacesError,
} from "@/lib/utils/country-remove";
import { findCountryBackingCity } from "@/lib/utils/country-pin";
import type { ProfileTrip } from "@/lib/utils/profile-page";
import type {
  NextRouteStop,
  NextRouteTransportMode,
  TravelStats,
  VisitedCity,
  VisitedCountry,
  VisitedPark,
  WishlistCountry,
} from "@/types/database";

type ProfileAllDestinationsViewProps = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isOwnProfile: boolean;
  previewAsPublic?: boolean;
  destinations: ProfileAllDestinations;
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  visitedCodes: string[];
  wishlistCodes: string[];
  wishlistCountries: WishlistCountry[];
  isLoggedIn: boolean;
  stats: TravelStats;
  initialNextRouteStops: NextRouteStop[];
  initialNextRouteTotalDays?: number;
  initialNextRouteTransport?: NextRouteTransportMode;
};

type ProfileAllTab = ProfileVisitedTab;

const MODAL_TITLES: Record<ProfileAllTab, string> = {
  countries: profileMessages.allDestinationsCountries,
  cities: profileMessages.allDestinationsCities,
  parks: profileMessages.allDestinationsParks,
  wishlist: profileMessages.wishlistCountries,
};

type OwnerActions = {
  editLabel: string;
  removeLabel: string;
} | null;

export function ProfileAllDestinationsView({
  username,
  displayName,
  avatarUrl = null,
  isOwnProfile,
  previewAsPublic = false,
  destinations,
  visitedCountries,
  visitedCities,
  visitedParks,
  visitedCodes,
  wishlistCodes,
  wishlistCountries,
  isLoggedIn,
  stats,
  initialNextRouteStops,
  initialNextRouteTotalDays,
  initialNextRouteTransport,
}: ProfileAllDestinationsViewProps) {
  const { common: commonMessages, country: countryMessages, profile: profileMessages, modal: modalMessages, saveDestination: saveDestinationMessages } = useAppMessages();
  const localeRaw = useLocale();
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";
  const modal = useModal();
  const toast = useToast();
  const [viewDestinations, setViewDestinations] = useState(destinations);
  const [viewVisitedCountries, setViewVisitedCountries] = useState(visitedCountries);
  const [viewVisitedCities, setViewVisitedCities] = useState(visitedCities);
  const [viewVisitedParks, setViewVisitedParks] = useState(visitedParks);
  const [viewVisitedCodes, setViewVisitedCodes] = useState(visitedCodes);
  const [viewWishlistCodes, setViewWishlistCodes] = useState(wishlistCodes);
  const [viewWishlistCountries, setViewWishlistCountries] = useState(wishlistCountries);
  const [viewStats, setViewStats] = useState(stats);
  const [viewNextRouteStops, setViewNextRouteStops] = useState(initialNextRouteStops);
  const [viewNextRouteTotalDays, setViewNextRouteTotalDays] = useState(initialNextRouteTotalDays);
  const [viewNextRouteTransport, setViewNextRouteTransport] = useState(initialNextRouteTransport);
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [editingParkId, setEditingParkId] = useState<string | null>(null);
  const [editingCountryCode, setEditingCountryCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileAllTab>("countries");
  const [openModalTab, setOpenModalTab] = useState<ProfileAllTab | null>(null);

  const applyPageData = useCallback(
    async (data: PublicProfilePageData) => {
      const viewData = previewAsPublic ? applyPublicPreviewToProfileData(data) : data;
      const { wishlistCountries: visibleWishlist, wishlistCodes: visibleWishlistCodes } =
        filterWishlistForProfileView(viewData, isOwnProfile);
      const { cityHeroImages, parkHeroImages } = await fetchHeroImageMaps();

      setViewVisitedCountries(viewData.visitedCountries);
      setViewVisitedCities(viewData.visitedCities);
      setViewVisitedParks(viewData.visitedParks);
      setViewVisitedCodes(viewData.visitedCodes);
      setViewWishlistCodes(visibleWishlistCodes);
      setViewWishlistCountries(visibleWishlist);
      setViewStats(viewData.stats);
      setViewNextRouteStops(viewData.profile.next_route ?? []);
      setViewNextRouteTotalDays(viewData.profile.next_route_total_days);
      setViewNextRouteTransport(viewData.profile.next_route_transport);
      setViewDestinations(
        buildProfileAllDestinations(
          viewData.visitedCountries,
          viewData.visitedCities,
          viewData.visitedParks,
          visibleWishlist,
          viewData.visitedCodes,
          viewData.profile.residence,
          locale,
          cityHeroImages,
          parkHeroImages
        )
      );
    },
    [isOwnProfile, locale, previewAsPublic]
  );

  useProfileStaleReload(username, true, (data) => {
    void applyPageData(data);
  });

  const title = formatMessage(profileMessages.allDestinationsTitle, {
    name: mapTitleOwnerName(displayName, locale),
  });

  const badgeLabels: Record<NonNullable<ProfileTrip["badge"]>, string> = {
    recent: profileMessages.tripBadgeRecent,
    favorite: profileMessages.tripBadgeFavorite,
    dayTrip: profileMessages.tripBadgeDayTrip,
  };

  const totalCount =
    viewDestinations.countries.length +
    viewDestinations.cities.length +
    viewDestinations.parks.length +
    viewDestinations.wishlist.length;

  const hasMapContent =
    viewVisitedCountries.length > 0 ||
    viewVisitedCities.length > 0 ||
    viewVisitedParks.length > 0 ||
    viewWishlistCodes.length > 0;

  const editingCity = viewVisitedCities.find((city) => city.id === editingCityId);
  const editingPark = viewVisitedParks.find((park) => park.id === editingParkId);
  const editingCountryBackingCity = editingCountryCode
    ? findCountryBackingCity(editingCountryCode, viewVisitedCities)
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

    const result = await deleteCitiesBatch({ ids: [id] });
    if (!result.ok) {
      await modal.alert(result.error ?? "Failed to delete city", { variant: "error" });
    }
  }

  async function handleDeletePark(id: string) {
    const confirmed = await modal.confirm(modalMessages.deleteParkMessage, {
      title: modalMessages.deleteParkTitle,
      destructive: true,
    });
    if (!confirmed) return;

    const result = await deleteParksBatch({ ids: [id] });
    if (!result.ok) {
      await modal.alert(result.error ?? "Failed to delete park", { variant: "error" });
    }
  }

  async function handleRemoveCountry(country: ProfileAllDestinations["countries"][number]) {
    const blockedByPlaces =
      country.cityCount > 0 ||
      country.parkCount > 0 ||
      country.visitedViaPlacesOnly ||
      countryHasMappedPlaces(country.code, viewVisitedCities, viewVisitedParks);

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

    const result = await removeVisitedCountry(country.visitedId);
    if (!result.ok) {
      if (isCountryRemoveBlockedByPlacesError(result.error)) {
        toast.show(countryMessages.removePlacesFirst);
        return;
      }
      await modal.alert(result.error ?? "Failed to remove country", { variant: "error" });
    }
  }

  async function handleRemoveWishlist(id: string) {
    const confirmed = await modal.confirm(modalMessages.deleteWishlistCountryMessage, {
      title: modalMessages.deleteWishlistCountryTitle,
      destructive: true,
    });
    if (!confirmed) return;

    const result = await removeWishlistCountry(id);
    if (!result.ok) {
      await modal.alert(result.error ?? "Failed to remove from wishlist", { variant: "error" });
    }
  }

  const hasNavContent = totalCount > 0;

  const ownerActions: OwnerActions = isOwnProfile
    ? {
        editLabel: commonMessages.edit,
        removeLabel: commonMessages.delete,
      }
    : null;

  const countriesPreview = previewItems(viewDestinations.countries);
  const citiesPreview = previewItems(viewDestinations.cities);
  const parksPreview = previewItems(viewDestinations.parks);
  const wishlistPreview = previewItems(viewDestinations.wishlist);

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
        return renderCountryCards(viewDestinations.countries);
      case "cities":
        return renderCityCards(viewDestinations.cities);
      case "parks":
        return renderParkCards(viewDestinations.parks);
      case "wishlist":
        return renderWishlistCards(viewDestinations.wishlist);
    }
  }

  return (
    <div className="profile-page profile-all-page">
      <div className="profile-shell">
        <div className="profile-all-header">
          <Link
            href={withProfilePublicPreview(profilePath(username), previewAsPublic)}
            className="profile-all-back"
          >
            ← {profileMessages.allDestinationsBack}
          </Link>
          <h1 className="profile-all-title" title={title}>
            {title}
          </h1>
        </div>

        {totalCount === 0 && !hasMapContent ? (
          <p className="profile-empty">{profileMessages.allDestinationsEmpty}</p>
        ) : (
          <>
            {hasMapContent ? (
              <div className="profile-all-map">
                <ProfileMapPanel
                  visitedCountryCodes={viewVisitedCodes}
                  wishlistCountryCodes={viewWishlistCodes}
                  visitedCountries={viewVisitedCountries}
                  wishlistCountries={viewWishlistCountries}
                  visitedCities={viewVisitedCities}
                  visitedParks={viewVisitedParks}
                  isLoggedIn={isLoggedIn}
                  canEditMap={isOwnProfile}
                  countryCount={viewStats.countries}
                  exploredBadgeLabel={profileMessages.mapExploredBadge}
                />
              </div>
            ) : null}

            {totalCount === 0 ? (
              <p className="profile-empty">{profileMessages.allDestinationsEmpty}</p>
            ) : (
              <main className="profile-all-main">
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
                  tab="countries"
                  title={profileMessages.allDestinationsCountries}
                  count={viewDestinations.countries.length}
                  onOpenAll={() => setOpenModalTab("countries")}
                >
                  {renderCountryCards(countriesPreview)}
                </DestinationSection>

                <DestinationSection
                  id={sectionId("cities")}
                  tab="cities"
                  title={profileMessages.allDestinationsCities}
                  count={viewDestinations.cities.length}
                  onOpenAll={() => setOpenModalTab("cities")}
                >
                  {renderCityCards(citiesPreview)}
                </DestinationSection>

                <DestinationSection
                  id={sectionId("parks")}
                  tab="parks"
                  title={profileMessages.allDestinationsParks}
                  count={viewDestinations.parks.length}
                  onOpenAll={() => setOpenModalTab("parks")}
                >
                  {renderParkCards(parksPreview)}
                </DestinationSection>

                <DestinationSection
                  id={sectionId("wishlist")}
                  tab="wishlist"
                  title={profileMessages.wishlistCountries}
                  count={viewDestinations.wishlist.length}
                  onOpenAll={() => setOpenModalTab("wishlist")}
                >
                  {renderWishlistCards(wishlistPreview)}
                </DestinationSection>
              </main>
            )}
          </>
        )}

        <ProfileNextRouteSection
          initialStops={viewNextRouteStops}
          initialTotalDays={viewNextRouteTotalDays}
          initialTransport={viewNextRouteTransport}
          isOwnProfile={isOwnProfile}
          displayName={displayName}
          username={username}
          avatarUrl={avatarUrl}
          visitedCountries={viewVisitedCountries}
          visitedCities={viewVisitedCities}
        />
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
        visitedCountries={viewVisitedCountries}
        onClose={() => {
          setEditingCityId(null);
          setEditingParkId(null);
          setEditingCountryCode(null);
        }}
      />
    </div>
  );
}
