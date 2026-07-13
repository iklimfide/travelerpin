"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { WorldMap } from "@/components/map/WorldMap";
import { CountryPopup } from "@/components/map/CountryPopup";
import { CityPopup } from "@/components/map/CityPopup";
import { MapContinentControl } from "@/components/map/MapContinentControl";
import { MapCountrySearch } from "@/components/map/MapCountrySearch";
import { MapPopularDestinations } from "@/components/map/MapPopularDestinations";
import { MapPopularParks } from "@/components/map/MapPopularParks";
import { MapLegend } from "@/components/map/MapLegend";
import { VisitedCountryFlags } from "@/components/map/VisitedCountryFlags";
import { useOptionalMapFocus, type MapFocusTarget } from "@/components/map/MapFocusContext";
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";
import {
  addVisitedCountry,
  addWishlistCountry,
  removeVisitedCountry,
  removeWishlistCountry,
} from "@/lib/client/country-actions";
import {
  TRAVEL_STATE_UPDATED_EVENT,
  type TravelStateData,
} from "@/lib/client/session-page-cache";
import { fetchTravelState } from "@/lib/client/travel-state";
import { countryMessages, mapMessages } from "@/lib/i18n/client-messages";
import {
  countryHasMappedPlaces,
  isCountryRemoveBlockedByPlacesError,
} from "@/lib/utils/country-remove";
import { getCountryContinent, DEFAULT_MAP_CONTINENT, type ContinentId } from "@/lib/map/continents";
import type { PopularDestination } from "@/lib/data/popular-destinations";
import type { PopularPark } from "@/lib/data/popular-parks";
import type { VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";

type CountrySelection = {
  code: string;
  name: string;
};

type TravelMapViewProps = {
  visitedCountryCodes: string[];
  wishlistCountryCodes?: string[];
  visitedCountries?: VisitedCountry[];
  wishlistCountries?: WishlistCountry[];
  userCities?: VisitedCity[];
  userParks?: VisitedPark[];
  citiesCountryCodes?: string[];
  parksCountryCodes?: string[];
  isLoggedIn?: boolean;
  /** When false, map is view-only (e.g. visitors on a shared profile). Defaults to isLoggedIn. */
  canEditMap?: boolean;
  interactive?: boolean;
  explorable?: boolean;
  showContinentFilter?: boolean;
  /** Landing page: card shell, filters below hero, light controls. */
  homeLayout?: boolean;
  profileHeader?: ReactNode;
  /** Public profile card: map only, flags/legend rendered outside. */
  compactProfile?: boolean;
};

export function TravelMapView({
  visitedCountryCodes,
  wishlistCountryCodes = [],
  visitedCountries = [],
  wishlistCountries = [],
  userCities = [],
  userParks = [],
  citiesCountryCodes = [],
  parksCountryCodes = [],
  isLoggedIn = false,
  canEditMap,
  interactive = true,
  explorable = false,
  showContinentFilter = false,
  homeLayout = false,
  profileHeader,
  compactProfile = false,
}: TravelMapViewProps) {
  const editable = canEditMap ?? isLoggedIn;
  const modal = useModal();
  const toast = useToast();
  const mapFocus = useOptionalMapFocus();
  const [localVisitedCountryCodes, setLocalVisitedCountryCodes] = useState(visitedCountryCodes);
  const [localWishlistCountryCodes, setLocalWishlistCountryCodes] = useState(wishlistCountryCodes);
  const [localVisitedCountries, setLocalVisitedCountries] = useState(visitedCountries);
  const [localWishlistCountries, setLocalWishlistCountries] = useState(wishlistCountries);
  const [localUserCities, setLocalUserCities] = useState(userCities);
  const [localUserParks, setLocalUserParks] = useState(userParks);
  const [localCitiesCountryCodes, setLocalCitiesCountryCodes] = useState(citiesCountryCodes);
  const [localParksCountryCodes, setLocalParksCountryCodes] = useState(parksCountryCodes);
  const [selectedCountry, setSelectedCountry] = useState<CountrySelection | null>(null);
  const [selectedCity, setSelectedCity] = useState<VisitedCity | null>(null);
  const [continent, setContinent] = useState<ContinentId>(
    homeLayout || compactProfile ? "world" : DEFAULT_MAP_CONTINENT
  );
  const [focusRequest, setFocusRequest] = useState<{ code: string; nonce: number } | null>(
    null
  );
  const [pinnedCountryCode, setPinnedCountryCode] = useState<string | null>(null);
  const [cityPickerFirst, setCityPickerFirst] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [optimisticVisitedCodes, setOptimisticVisitedCodes] = useState<Set<string>>(
    () => new Set()
  );
  const showWishlist = localWishlistCountryCodes.length > 0;

  useEffect(() => {
    setLocalVisitedCountryCodes(visitedCountryCodes);
    setLocalWishlistCountryCodes(wishlistCountryCodes);
    setLocalVisitedCountries(visitedCountries);
    setLocalWishlistCountries(wishlistCountries);
    setLocalUserCities(userCities);
    setLocalUserParks(userParks);
    setLocalCitiesCountryCodes(citiesCountryCodes);
    setLocalParksCountryCodes(parksCountryCodes);
  }, [
    visitedCountryCodes,
    wishlistCountryCodes,
    visitedCountries,
    wishlistCountries,
    userCities,
    userParks,
    citiesCountryCodes,
    parksCountryCodes,
  ]);

  const syncTravelState = useCallback(async (options?: { force?: boolean }) => {
    if (!isLoggedIn || !editable) return;

    try {
      const result = await fetchTravelState({
        preferCache: !options?.force,
        force: options?.force,
      });
      if (!result.ok) return;

      const data = result.data;
      setLocalVisitedCountries(data.visitedCountries);
      setLocalVisitedCountryCodes(data.visitedCodes);
      setLocalUserCities(data.visitedCities);
      setLocalUserParks(data.visitedParks);
      setLocalWishlistCountries(data.wishlistCountries);
      setLocalWishlistCountryCodes(
        data.wishlistCountries.map((country) => country.country_code.toUpperCase())
      );
      setLocalCitiesCountryCodes([
        ...new Set(data.visitedCities.map((city) => city.country_code.toUpperCase())),
      ]);
      setLocalParksCountryCodes([
        ...new Set(data.visitedParks.map((park) => park.country_code.toUpperCase())),
      ]);
      setOptimisticVisitedCodes(new Set());
    } catch {
      // Keep optimistic UI if refresh fails.
    }
  }, [editable, isLoggedIn]);

  useEffect(() => {
    function onTravelStateUpdated(event: Event) {
      const detail = (event as CustomEvent<{ data: TravelStateData }>).detail;
      if (!detail?.data || !isLoggedIn || !editable) return;

      const data = detail.data;
      setLocalVisitedCountries(data.visitedCountries);
      setLocalVisitedCountryCodes(data.visitedCodes);
      setLocalUserCities(data.visitedCities);
      setLocalUserParks(data.visitedParks);
      setLocalWishlistCountries(data.wishlistCountries);
      setLocalWishlistCountryCodes(
        data.wishlistCountries.map((country) => country.country_code.toUpperCase())
      );
      setLocalCitiesCountryCodes([
        ...new Set(data.visitedCities.map((city) => city.country_code.toUpperCase())),
      ]);
      setLocalParksCountryCodes([
        ...new Set(data.visitedParks.map((park) => park.country_code.toUpperCase())),
      ]);
      setOptimisticVisitedCodes(new Set());
    }

    window.addEventListener(TRAVEL_STATE_UPDATED_EVENT, onTravelStateUpdated);
    return () => window.removeEventListener(TRAVEL_STATE_UPDATED_EVENT, onTravelStateUpdated);
  }, [editable, isLoggedIn]);

  const visitedCodeSet = useMemo(() => {
    const codes = new Set(localVisitedCountryCodes.map((c) => c.toUpperCase()));
    for (const code of optimisticVisitedCodes) {
      codes.add(code);
    }
    return codes;
  }, [localVisitedCountryCodes, optimisticVisitedCodes]);

  const wishlistCodeSet = useMemo(
    () => new Set(localWishlistCountryCodes.map((c) => c.toUpperCase())),
    [localWishlistCountryCodes]
  );

  const placesCodeSet = useMemo(() => {
    const codes = new Set([
      ...localCitiesCountryCodes.map((c) => c.toUpperCase()),
      ...localParksCountryCodes.map((c) => c.toUpperCase()),
    ]);
    return codes;
  }, [localCitiesCountryCodes, localParksCountryCodes]);

  const visitedByCode = useMemo(() => {
    const map = new Map<string, VisitedCountry>();
    for (const country of localVisitedCountries) {
      map.set(country.country_code.toUpperCase(), country);
    }
    return map;
  }, [localVisitedCountries]);

  const wishlistByCode = useMemo(() => {
    const map = new Map<string, WishlistCountry>();
    for (const country of localWishlistCountries) {
      map.set(country.country_code.toUpperCase(), country);
    }
    return map;
  }, [localWishlistCountries]);

  const selectedStatus = useMemo(() => {
    if (!selectedCountry) return null;

    const code = selectedCountry.code.toUpperCase();
    const visitedRecord = visitedByCode.get(code);
    const wishlistRecord = wishlistByCode.get(code);
    const isVisitedOnMap = visitedCodeSet.has(code);
    const isUserVisited =
      Boolean(visitedRecord) ||
      optimisticVisitedCodes.has(code) ||
      (isVisitedOnMap && placesCodeSet.has(code));
    const visitedViaPlacesOnly = isVisitedOnMap && !visitedRecord && placesCodeSet.has(code);
    const isUserWishlist = wishlistCodeSet.has(code) && !isUserVisited;

    return {
      code,
      isVisitedOnMap,
      isUserVisited,
      isUserWishlist,
      visitedId: visitedRecord?.id,
      wishlistId: wishlistRecord?.id,
      visitedViaPlacesOnly,
      canPickCities: editable && isUserVisited,
    };
  }, [
    selectedCountry,
    visitedByCode,
    wishlistByCode,
    visitedCodeSet,
    wishlistCodeSet,
    placesCodeSet,
    optimisticVisitedCodes,
    editable,
  ]);

  const existingCityNamesForSelected = useMemo(() => {
    if (!selectedStatus) return [];
    return localUserCities
      .filter((city) => city.country_code.toUpperCase() === selectedStatus.code)
      .map((city) => city.city_name);
  }, [selectedStatus, localUserCities]);

  const existingParkKeysForSelected = useMemo(() => {
    if (!selectedStatus) return [];
    return localUserParks
      .filter((park) => park.country_code.toUpperCase() === selectedStatus.code)
      .map((park) => `${park.park_type}:${park.park_name}`);
  }, [selectedStatus, localUserParks]);

  const requireLogin = () => {
    toast.show(mapMessages.loginToMark);
  };

  const handleCountryClick = (country: CountrySelection) => {
    setCityPickerFirst(false);
    setSelectedCountry(country);
    setPinnedCountryCode(country.code);
  };

  const handleVisitedChange = async (checked: boolean) => {
    if (!selectedStatus || !selectedCountry) return;
    if (!editable) return;
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    if (busyCode) return;

    setBusyCode(selectedStatus.code);

    try {
      if (checked) {
        const result = await addVisitedCountry(selectedStatus.code);
        if (!result.ok) {
          await modal.alert(result.error, { variant: "error" });
          return;
        }
        setOptimisticVisitedCodes((prev) => new Set(prev).add(selectedStatus.code));
        setCityPickerFirst(true);
      } else {
        if (
          selectedStatus.visitedViaPlacesOnly ||
          countryHasMappedPlaces(selectedStatus.code, localUserCities, localUserParks)
        ) {
          toast.show(countryMessages.removePlacesFirst);
          return;
        }
        if (!selectedStatus.visitedId) return;

        const result = await removeVisitedCountry(selectedStatus.visitedId);
        if (!result.ok) {
          if (isCountryRemoveBlockedByPlacesError(result.error)) {
            toast.show(countryMessages.removePlacesFirst);
            return;
          }
          await modal.alert(result.error, { variant: "error" });
          return;
        }
        setOptimisticVisitedCodes((prev) => {
          const next = new Set(prev);
          next.delete(selectedStatus.code);
          return next;
        });
      }

      void syncTravelState();
    } finally {
      setBusyCode(null);
    }
  };

  const handleWishlistChange = async (checked: boolean) => {
    if (!selectedStatus) return;
    if (!editable) return;
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    if (busyCode || selectedStatus.isUserVisited) return;

    setBusyCode(selectedStatus.code);

    try {
      if (checked) {
        const result = await addWishlistCountry(selectedStatus.code);
        if (!result.ok) {
          await modal.alert(result.error, { variant: "error" });
          return;
        }
      } else {
        if (!selectedStatus.wishlistId) return;

        const result = await removeWishlistCountry(selectedStatus.wishlistId);
        if (!result.ok) {
          await modal.alert(result.error, { variant: "error" });
          return;
        }
      }

      void syncTravelState();
    } finally {
      setBusyCode(null);
    }
  };

  const handleCitiesAdded = () => {
    void syncTravelState();
    setSelectedCountry(null);
    setPinnedCountryCode(null);
    setCityPickerFirst(false);
  };

  const handleParksAdded = () => {
    void syncTravelState();
    setSelectedCountry(null);
    setPinnedCountryCode(null);
    setCityPickerFirst(false);
  };

  const handleCountrySearch = (country: { code: string; name: string }) => {
    focusCountryOnMap(country);
  };

  const focusCountryOnMap = useCallback(
    (country: MapFocusTarget) => {
      const code = country.code.toUpperCase();
      const countryContinent = getCountryContinent(code);
      setCityPickerFirst(false);
      setPinnedCountryCode(code);
      if (explorable) {
        setSelectedCountry({ code, name: country.name });
      }
      if (countryContinent) {
        setContinent(countryContinent);
      }
      setFocusRequest({ code, nonce: Date.now() });
    },
    [explorable]
  );

  const handleDestinationAdded = useCallback(
    (destination: PopularDestination) => {
      const code = destination.countryCode.toUpperCase();
      const countryContinent = getCountryContinent(code);
      setOptimisticVisitedCodes((prev) => new Set(prev).add(code));
      setPinnedCountryCode(code);
      if (countryContinent) {
        setContinent(countryContinent);
      }
      setFocusRequest({ code, nonce: Date.now() });
      void syncTravelState();
    },
    [syncTravelState]
  );

  const handleDestinationRemoved = useCallback(
    (destination: PopularDestination, countryRemoved: boolean) => {
      const code = destination.countryCode.toUpperCase();
      if (countryRemoved) {
        setOptimisticVisitedCodes((prev) => {
          const next = new Set(prev);
          next.delete(code);
          return next;
        });
        setPinnedCountryCode(null);
      }
      void syncTravelState();
    },
    [syncTravelState]
  );

  const handleParkAdded = useCallback(
    (park: PopularPark) => {
      const code = park.countryCode.toUpperCase();
      const countryContinent = getCountryContinent(code);
      setOptimisticVisitedCodes((prev) => new Set(prev).add(code));
      setPinnedCountryCode(code);
      if (countryContinent) {
        setContinent(countryContinent);
      }
      setFocusRequest({ code, nonce: Date.now() });
      void syncTravelState();
    },
    [syncTravelState]
  );

  const handleParkRemoved = useCallback(
    (park: PopularPark, countryRemoved: boolean) => {
      const code = park.countryCode.toUpperCase();
      if (countryRemoved) {
        setOptimisticVisitedCodes((prev) => {
          const next = new Set(prev);
          next.delete(code);
          return next;
        });
        setPinnedCountryCode(null);
      }
      void syncTravelState();
    },
    [syncTravelState]
  );

  useEffect(() => {
    if (!mapFocus) return;
    mapFocus.registerFocusHandler(focusCountryOnMap);
    return () => mapFocus.registerFocusHandler(null);
  }, [focusCountryOnMap, mapFocus]);

  const filterGrid = showContinentFilter ? (
    <div
      className={
        homeLayout
          ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 [&_input]:h-[50px] [&_input]:rounded-[14px] [&_input]:border-[#d8e1ef] [&_input]:bg-white [&_input]:px-[15px] [&_input]:text-[#111827] [&_input]:shadow-[0_5px_14px_rgba(15,23,42,0.05)] [&_input]:placeholder:text-[#94a3b8] [&_input]:focus:border-[#93c5fd] [&_input]:focus:ring-4 [&_input]:focus:ring-[rgba(37,99,235,0.10)] [&_select]:h-[50px] [&_select]:rounded-[14px] [&_select]:border-[#d8e1ef] [&_select]:bg-white [&_select]:px-[15px] [&_select]:text-[#111827] [&_select]:shadow-[0_5px_14px_rgba(15,23,42,0.05)] [&_select]:focus:border-[#93c5fd] [&_select]:focus:ring-4 [&_select]:focus:ring-[rgba(37,99,235,0.10)]"
          : "mb-2 grid min-w-0 max-w-full grid-cols-1 gap-2 overflow-x-hidden sm:mb-3 sm:grid-cols-2 xl:grid-cols-4"
      }
    >
      <div className="w-full min-w-0">
        <MapContinentControl
          continent={continent}
          onChange={(next) => {
            setContinent(next);
            setPinnedCountryCode(null);
          }}
        />
      </div>
      <div className="w-full min-w-0">
        <MapCountrySearch onSelect={handleCountrySearch} />
      </div>
      <div className="w-full min-w-0">
        <MapPopularDestinations
          isLoggedIn={isLoggedIn}
          onRequireLogin={requireLogin}
          visitedCities={localUserCities}
          visitedCountries={localVisitedCountries}
          onAdded={handleDestinationAdded}
          onRemoved={handleDestinationRemoved}
        />
      </div>
      <div className="w-full min-w-0">
        <MapPopularParks
          isLoggedIn={isLoggedIn}
          onRequireLogin={requireLogin}
          visitedParks={localUserParks}
          onAdded={handleParkAdded}
          onRemoved={handleParkRemoved}
        />
      </div>
    </div>
  ) : null;

  const mapBlock = (
    <div
      id={homeLayout ? "sample-map" : "travel-map"}
      className={`relative w-full min-w-0 max-w-full overflow-hidden scroll-mt-24`}
    >
      {homeLayout ? (
        <div className="pointer-events-none absolute left-[18px] top-4 z-10 hidden max-w-[calc(100%-2.25rem)] rounded-full border border-slate-300/35 bg-white/86 px-3 py-2 text-[13px] font-bold text-[#475569] backdrop-blur-sm sm:block">
          {mapMessages.demoExploreHint}
        </div>
      ) : null}
      <WorldMap
        visitedCountryCodes={[...visitedCodeSet]}
        wishlistCountryCodes={localWishlistCountryCodes}
        userCities={localUserCities}
        onCountryClick={explorable ? handleCountryClick : undefined}
        onCityClick={interactive && localUserCities.length > 0 ? (city) => setSelectedCity(city) : undefined}
        interactive={interactive}
        explorable={explorable}
        continent={continent}
        focusRequest={focusRequest}
        onFocusComplete={() => setFocusRequest(null)}
        pinnedCountryCode={pinnedCountryCode}
        mainlandWorld={compactProfile || homeLayout}
      />
    </div>
  );

  const flagsBlock = (
    <VisitedCountryFlags
      visitedCountries={localVisitedCountries}
      userCities={localUserCities}
      userParks={localUserParks}
      countryCodes={localVisitedCountryCodes}
      onCountryClick={explorable ? focusCountryOnMap : undefined}
      variant={homeLayout ? "landing" : "default"}
      className={
        homeLayout ? "border-t border-[#d8e1ef] !px-3 !py-2 sm:!px-4 sm:!py-2.5" : ""
      }
    />
  );

  const popups = (
    <>
      {selectedCountry && selectedStatus && (
        <CountryPopup
          countryName={selectedCountry.name}
          countryCode={selectedCountry.code}
          isVisited={
            editable && isLoggedIn
              ? selectedStatus.isUserVisited
              : selectedStatus.isVisitedOnMap
          }
          isWishlist={
            editable && isLoggedIn
              ? selectedStatus.isUserWishlist
              : wishlistCodeSet.has(selectedStatus.code) && !selectedStatus.isVisitedOnMap
          }
          visitedViaPlacesOnly={selectedStatus.visitedViaPlacesOnly}
          busy={busyCode === selectedStatus.code}
          showCityPicker={selectedStatus.canPickCities}
          existingCityNames={existingCityNamesForSelected}
          existingParkKeys={existingParkKeysForSelected}
          readOnly={!editable}
          onVisitedChange={handleVisitedChange}
          onWishlistChange={handleWishlistChange}
          onCitiesAdded={handleCitiesAdded}
          onParksAdded={handleParksAdded}
          cityPickerFirst={cityPickerFirst}
          onClose={() => {
            setSelectedCountry(null);
            setPinnedCountryCode(null);
            setCityPickerFirst(false);
          }}
        />
      )}
      {selectedCity && (
        <CityPopup city={selectedCity} onClose={() => setSelectedCity(null)} />
      )}
    </>
  );

  if (homeLayout) {
    return (
      <div className="contents">
        <aside className="min-w-0 overflow-hidden rounded-[30px] border border-[#d8e1ef] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
          {profileHeader}
          <div className="border-b border-[#d8e1ef] bg-white px-3 py-3 sm:px-5 sm:py-4">
            {filterGrid}
          </div>
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_28%_22%,rgba(37,99,235,0.14),transparent_30%),radial-gradient(circle_at_75%_65%,rgba(16,185,129,0.10),transparent_28%),linear-gradient(180deg,#dbeafe_0%,#eff6ff_100%)] px-3 pt-3 pb-0 sm:px-6 sm:pt-5 sm:pb-0">
            <p className="mb-2 text-center text-[11px] font-semibold leading-snug text-[#475569] sm:hidden">
              {mapMessages.demoExploreHint}
            </p>
            {mapBlock}
          </div>
          {flagsBlock}
        </aside>
        {popups}
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-clip">
      {filterGrid}
      {mapBlock}
      {!compactProfile ? flagsBlock : null}
      {explorable && !homeLayout && !compactProfile && (
        <p className="mt-1 hidden text-center text-xs text-slate-500 sm:mt-2 sm:block">
          {showContinentFilter ? mapMessages.demoExploreHint : mapMessages.exploreHint}
        </p>
      )}
      {!compactProfile ? <MapLegend showWishlist={showWishlist} /> : null}
      {popups}
    </div>
  );
}
