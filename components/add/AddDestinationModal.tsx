"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CountryPickerStep } from "@/components/add/CountryPickerStep";
import { CityPickerStep, citySelectionKey } from "@/components/add/CityPickerStep";
import {
  ParkPickerStep,
  parkSelectionKey,
  type CatalogPark,
} from "@/components/add/ParkPickerStep";
import {
  PROFILE_DATA_STALE_EVENT,
  TRAVEL_STATE_UPDATED_EVENT,
  notifyTravelStateUpdated,
  readTravelStateCache,
  type TravelStateData,
} from "@/lib/client/session-page-cache";
import {
  fetchTravelState,
  refreshTravelStateAfterSave,
  savePendingDestinations,
  savePendingParks,
  type PendingCitySelection,
  type PendingParkSelection,
} from "@/lib/client/travel-state";
import {
  getAddRegionForCountryCode,
  type AddRegionId,
} from "@/lib/add/countries-by-region";
import { addDestinationMessages, commonMessages } from "@/lib/i18n/client-messages";
import type { CountryOption } from "@/lib/data/countries";
import { isUkNationCode, isUkNationVisited, matchesUkCityCountry } from "@/lib/data/uk-nations";
import { canonicalCityName, citiesAreSame } from "@/lib/utils/city-aliases";
import { formatKnownPlaceName } from "@/lib/utils/city-name";
import { isNaturaParkType, isThemeParkType } from "@/lib/utils/park-type";
import type { VisitedCity, VisitedPark } from "@/types/database";
import { AddDestinationCountryPickerSkeleton } from "@/components/skeletons/AddDestinationModalSkeleton";
import { useToast } from "@/components/ui/ToastProvider";
import "./add-destination.css";

export type AddDestinationMode = "places" | "parks";

type AddDestinationModalProps = {
  onClose: () => void;
  mode?: AddDestinationMode;
};

type Step =
  | { kind: "countries" }
  | { kind: "cities"; countryCode: string; countryName: string }
  | { kind: "parks"; countryCode: string; countryName: string };

function applyTravelState(
  data: TravelStateData,
  setVisitedCodes: (codes: Set<string>) => void,
  setVisitedCities: (cities: VisitedCity[]) => void,
  setVisitedParks: (parks: VisitedPark[]) => void
) {
  setVisitedCodes(
    new Set(data.visitedCodes.map((code) => code.toUpperCase()))
  );
  setVisitedCities(data.visitedCities);
  setVisitedParks(data.visitedParks);
}

function applyOptimisticPlacesSave(params: {
  pendingCountryCodes: Set<string>;
  pendingCities: Map<string, PendingCitySelection>;
  visitedCodes: Set<string>;
  visitedCities: VisitedCity[];
}): { visitedCodes: Set<string>; visitedCities: VisitedCity[] } {
  const nextCodes = new Set(params.visitedCodes);
  for (const code of params.pendingCountryCodes) {
    nextCodes.add(code.toUpperCase());
  }

  const nextCities = [...params.visitedCities];
  for (const city of params.pendingCities.values()) {
    const countryCode = city.countryCode.toUpperCase();
    const cityName = canonicalCityName(countryCode, city.cityName);
    nextCodes.add(countryCode);
    if (
      nextCities.some(
        (visited) =>
          matchesUkCityCountry(visited.country_code, countryCode) &&
          citiesAreSame(countryCode, visited.city_name, cityName)
      )
    ) {
      continue;
    }
    nextCities.push({
      id: `optimistic-${countryCode}-${cityName}`,
      user_id: "",
      city_name: cityName,
      country_code: countryCode,
      country_name: "",
      latitude: null,
      longitude: null,
      note: null,
      photo_url: null,
      instagram_urls: [],
      media_type: null,
      media_url: null,
      media_preview_url: null,
      visit_dates: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return { visitedCodes: nextCodes, visitedCities: nextCities };
}

function applyOptimisticParksSave(params: {
  pendingParks: Map<string, PendingParkSelection>;
  visitedCodes: Set<string>;
  visitedParks: VisitedPark[];
}): { visitedCodes: Set<string>; visitedParks: VisitedPark[] } {
  const nextCodes = new Set(params.visitedCodes);
  const nextParks = [...params.visitedParks];

  for (const park of params.pendingParks.values()) {
    const countryCode = park.countryCode.toUpperCase();
    nextCodes.add(countryCode);
    const alreadyOnMap = nextParks.some(
      (visited) =>
        visited.country_code.toUpperCase() === countryCode &&
        visited.park_type === park.parkType &&
        visited.park_name.trim().toLowerCase() === park.parkName.trim().toLowerCase()
    );
    if (alreadyOnMap) continue;

    nextParks.push({
      id: `optimistic-${countryCode}-${park.parkType}-${park.parkName}`,
      user_id: "",
      park_name: park.parkName,
      park_type: park.parkType,
      country_code: countryCode,
      country_name: park.countryName,
      latitude: park.latitude ?? null,
      longitude: park.longitude ?? null,
      note: null,
      photo_url: null,
      instagram_urls: [],
      media_type: null,
      media_url: null,
      visit_dates: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return { visitedCodes: nextCodes, visitedParks: nextParks };
}

export function AddDestinationModal({ onClose, mode = "places" }: AddDestinationModalProps) {
  const toast = useToast();
  const isParksMode = mode === "parks";
  const [step, setStep] = useState<Step>({ kind: "countries" });
  const [visitedCodes, setVisitedCodes] = useState<Set<string>>(new Set());
  const [visitedCities, setVisitedCities] = useState<VisitedCity[]>([]);
  const [visitedParks, setVisitedParks] = useState<VisitedPark[]>([]);
  const [pendingCountryCodes, setPendingCountryCodes] = useState<Set<string>>(new Set());
  const [pendingCities, setPendingCities] = useState<Map<string, PendingCitySelection>>(
    () => new Map()
  );
  const [pendingParks, setPendingParks] = useState<Map<string, PendingParkSelection>>(
    () => new Map()
  );
  const [returnExpandedRegion, setReturnExpandedRegion] = useState<AddRegionId | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const hasTravelStateRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadTravelState = useCallback(async (options?: { background?: boolean; force?: boolean }) => {
    const background = options?.background ?? hasTravelStateRef.current;
    if (!background) {
      setLoadingState(true);
    }

    const result = await fetchTravelState({
      preferCache: !options?.force,
      force: options?.force,
    });

    if (result.ok) {
      applyTravelState(result.data, setVisitedCodes, setVisitedCities, setVisitedParks);
      hasTravelStateRef.current = true;
    }

    if (!background) {
      setLoadingState(false);
    }
  }, []);

  useEffect(() => {
    hasTravelStateRef.current = false;
    setStep({ kind: "countries" });
    setPendingCountryCodes(new Set());
    setPendingCities(new Map());
    setPendingParks(new Map());
    setReturnExpandedRegion(null);
    setSaveError(null);
    void loadTravelState({ background: false });
  }, [loadTravelState, mode]);

  useEffect(() => {
    function onProfileStale() {
      void loadTravelState({ background: true, force: true });
    }

    function onTravelStateUpdated(event: Event) {
      const detail = (event as CustomEvent<{ data: TravelStateData }>).detail;
      if (!detail?.data) return;
      applyTravelState(detail.data, setVisitedCodes, setVisitedCities, setVisitedParks);
      hasTravelStateRef.current = true;
    }

    window.addEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
    window.addEventListener(TRAVEL_STATE_UPDATED_EVENT, onTravelStateUpdated);
    return () => {
      window.removeEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
      window.removeEventListener(TRAVEL_STATE_UPDATED_EVENT, onTravelStateUpdated);
    };
  }, [loadTravelState]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  const parkCountryCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const park of visitedParks) {
      codes.add(park.country_code.toUpperCase());
    }
    return codes;
  }, [visitedParks]);

  const existingCityNames = useMemo(() => {
    if (step.kind !== "cities") return [];
    const code = step.countryCode.toUpperCase();
    return visitedCities
      .filter((city) => matchesUkCityCountry(city.country_code, code))
      .map((city) => city.city_name);
  }, [step, visitedCities]);

  const existingParkKeys = useMemo(() => {
    if (step.kind !== "parks") return [];
    const code = step.countryCode.toUpperCase();
    return visitedParks
      .filter((park) => park.country_code.toUpperCase() === code)
      .map((park) => parkSelectionKey(park.park_type, park.park_name));
  }, [step, visitedParks]);

  const pendingCityKeys = useMemo(() => new Set(pendingCities.keys()), [pendingCities]);
  const pendingParkKeys = useMemo(() => new Set(pendingParks.keys()), [pendingParks]);

  const pendingSelectionCount = useMemo(() => {
    if (isParksMode) {
      return [...pendingParks.values()].filter((park) => {
        const alreadyOnMap = visitedParks.some(
          (visited) =>
            visited.country_code.toUpperCase() === park.countryCode.toUpperCase() &&
            visited.park_type === park.parkType &&
            visited.park_name.trim().toLowerCase() === park.parkName.trim().toLowerCase()
        );
        return !alreadyOnMap;
      }).length;
    }

    const newCountries = [...pendingCountryCodes].filter((code) => {
      const normalized = code.toUpperCase();
      return isUkNationCode(normalized)
        ? !isUkNationVisited(normalized, visitedCodes)
        : !visitedCodes.has(normalized);
    }).length;
    const newCities = [...pendingCities.values()].filter((city) => {
      const alreadyOnMap = visitedCities.some(
        (visited) =>
          matchesUkCityCountry(visited.country_code, city.countryCode) &&
          citiesAreSame(city.countryCode, visited.city_name, city.cityName)
      );
      return !alreadyOnMap;
    }).length;

    return newCountries + newCities;
  }, [
    isParksMode,
    pendingCities,
    pendingCountryCodes,
    pendingParks,
    visitedCities,
    visitedCodes,
    visitedParks,
  ]);

  function handleToggleCountry(country: CountryOption) {
    if (isParksMode) return;

    const code = country.code.toUpperCase();
    if (isUkNationCode(code) ? isUkNationVisited(code, visitedCodes) : visitedCodes.has(code)) {
      return;
    }

    setPendingCountryCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleOpenCountry(country: CountryOption) {
    setReturnExpandedRegion(getAddRegionForCountryCode(country.code));
    setStep({
      kind: isParksMode ? "parks" : "cities",
      countryCode: country.code,
      countryName: formatKnownPlaceName(country.name),
    });
  }

  function handleToggleCity(city: { countryCode: string; name: string }) {
    const key = citySelectionKey(city.countryCode, city.name);
    const alreadyOnMap = visitedCities.some(
      (visited) =>
        matchesUkCityCountry(visited.country_code, city.countryCode) &&
        citiesAreSame(city.countryCode, visited.city_name, city.name)
    );
    if (alreadyOnMap) return;

    setPendingCities((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, {
          countryCode: city.countryCode.toUpperCase(),
          cityName: city.name,
        });
      }
      return next;
    });
  }

  function handleTogglePark(park: CatalogPark) {
    const key = parkSelectionKey(park.parkType, park.name);
    const alreadyOnMap = visitedParks.some(
      (visited) =>
        visited.country_code.toUpperCase() === park.countryCode.toUpperCase() &&
        visited.park_type === park.parkType &&
        visited.park_name.trim().toLowerCase() === park.name.trim().toLowerCase()
    );
    if (alreadyOnMap) return;

    setPendingParks((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, {
          countryCode: park.countryCode.toUpperCase(),
          countryName: step.kind === "parks" ? step.countryName : "",
          parkName: park.name,
          parkType: park.parkType,
          latitude: park.latitude,
          longitude: park.longitude,
        });
      }
      return next;
    });
  }

  function handleSave() {
    if (pendingSelectionCount === 0 || saving) return;

    setSaving(true);
    setSaveError(null);

    if (isParksMode) {
      const pendingParksSnapshot = new Map(pendingParks);
      const optimistic = applyOptimisticParksSave({
        pendingParks: pendingParksSnapshot,
        visitedCodes,
        visitedParks,
      });
      setVisitedCodes(optimistic.visitedCodes);
      setVisitedParks(optimistic.visitedParks);

      const cached = readTravelStateCache();
      const nationalParks = optimistic.visitedParks.filter((park) =>
        isNaturaParkType(park.park_type)
      ).length;
      const themeParks = optimistic.visitedParks.filter((park) =>
        isThemeParkType(park.park_type)
      ).length;
      const nextData: TravelStateData = {
        visitedCountries: cached?.visitedCountries ?? [],
        visitedCities: cached?.visitedCities ?? [],
        visitedParks: optimistic.visitedParks,
        wishlistCountries: cached?.wishlistCountries ?? [],
        visitedCodes: [...optimistic.visitedCodes],
        stats: {
          countries: optimistic.visitedCodes.size,
          cities: cached?.stats.cities ?? 0,
          nationalParks,
          themeParks,
        },
      };
      notifyTravelStateUpdated(nextData);

      setPendingParks(new Map());
      onClose();

      void (async () => {
        try {
          const result = await savePendingParks({
            pendingParks: pendingParksSnapshot.values(),
            visitedParks,
          });

          if (!result.ok) {
            toast.show(
              result.error.toLowerCase().includes("unauthorized")
                ? addDestinationMessages.loginRequired
                : result.error
            );
            refreshTravelStateAfterSave();
            return;
          }

          refreshTravelStateAfterSave();
        } catch {
          toast.show(addDestinationMessages.saveFailed);
          refreshTravelStateAfterSave();
        }
      })();
      return;
    }

    const pendingCountrySnapshot = new Set(pendingCountryCodes);
    const pendingCitiesSnapshot = new Map(pendingCities);

    const optimistic = applyOptimisticPlacesSave({
      pendingCountryCodes: pendingCountrySnapshot,
      pendingCities: pendingCitiesSnapshot,
      visitedCodes,
      visitedCities,
    });
    setVisitedCodes(optimistic.visitedCodes);
    setVisitedCities(optimistic.visitedCities);

    const cached = readTravelStateCache();
    const nextData: TravelStateData = {
      visitedCountries: cached?.visitedCountries ?? [],
      visitedCities: optimistic.visitedCities,
      visitedParks: cached?.visitedParks ?? [],
      wishlistCountries: cached?.wishlistCountries ?? [],
      visitedCodes: [...optimistic.visitedCodes],
      stats: {
        countries: optimistic.visitedCodes.size,
        cities: optimistic.visitedCities.length,
        nationalParks: cached?.stats.nationalParks ?? 0,
        themeParks: cached?.stats.themeParks ?? 0,
      },
    };
    notifyTravelStateUpdated(nextData);

    setPendingCountryCodes(new Set());
    setPendingCities(new Map());
    onClose();

    void (async () => {
      try {
        const result = await savePendingDestinations({
          pendingCountryCodes: pendingCountrySnapshot,
          pendingCities: pendingCitiesSnapshot.values(),
          visitedCodes,
          visitedCities,
        });

        if (!result.ok) {
          toast.show(
            result.error.toLowerCase().includes("unauthorized")
              ? addDestinationMessages.loginRequired
              : result.error
          );
          refreshTravelStateAfterSave();
          return;
        }

        refreshTravelStateAfterSave();
      } catch {
        toast.show(addDestinationMessages.saveFailed);
        refreshTravelStateAfterSave();
      }
    })();
  }

  if (!mounted) return null;

  const isDetailStep = step.kind === "cities" || step.kind === "parks";

  return createPortal(
    <div className="add-destination-modal" role="presentation">
      <button
        type="button"
        className="add-destination-modal__backdrop"
        aria-label={addDestinationMessages.close}
        onClick={onClose}
        disabled={saving}
      />
      <div
        className="add-destination-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-destination-title"
      >
        <div
          className={`add-destination-modal__header${
            isDetailStep ? " add-destination-modal__header--cities" : ""
          }`}
        >
          {step.kind === "countries" ? (
            <h2 id="add-destination-title" className="add-destination-modal__title">
              {isParksMode
                ? addDestinationMessages.selectCountryForParksTitle
                : addDestinationMessages.selectCountryTitle}
            </h2>
          ) : (
            <>
              <button
                type="button"
                className="add-destination-back add-destination-back--on-header"
                onClick={() => setStep({ kind: "countries" })}
              >
                <span className="add-destination-back__chevron" aria-hidden>
                  &lt;
                </span>
                {addDestinationMessages.back}
              </button>
              <h2 id="add-destination-title" className="sr-only">
                {step.countryName}
              </h2>
            </>
          )}
          <button
            type="button"
            className="add-destination-modal__close"
            aria-label={addDestinationMessages.close}
            onClick={onClose}
            disabled={saving}
          >
            ✕
          </button>
        </div>

        <div className="add-destination-modal__body">
          {loadingState && step.kind === "countries" ? (
            <AddDestinationCountryPickerSkeleton />
          ) : step.kind === "countries" ? (
            <CountryPickerStep
              visitedCodes={isParksMode ? new Set() : visitedCodes}
              countedCodes={isParksMode ? parkCountryCodes : undefined}
              pendingCountryCodes={pendingCountryCodes}
              onToggleCountry={handleToggleCountry}
              onOpenCountry={handleOpenCountry}
              hideCountryCheckbox={isParksMode}
              listHint={
                isParksMode
                  ? addDestinationMessages.parkSaveHint
                  : addDestinationMessages.saveHint
              }
              regionProgressSuffix={isParksMode ? "with parks" : "visited"}
              initialExpandedRegion={returnExpandedRegion}
            />
          ) : step.kind === "parks" ? (
            <ParkPickerStep
              countryCode={step.countryCode}
              countryName={step.countryName}
              existingParkKeys={existingParkKeys}
              pendingParkKeys={pendingParkKeys}
              onTogglePark={handleTogglePark}
            />
          ) : (
            <CityPickerStep
              countryCode={step.countryCode}
              countryName={step.countryName}
              existingCityNames={existingCityNames}
              pendingCityKeys={pendingCityKeys}
              onToggleCity={handleToggleCity}
            />
          )}
        </div>

        <div
          className={`add-destination-modal__footer${
            saveError ? "" : " add-destination-modal__footer--action-only"
          }`}
        >
          {saveError ? (
            <p className="add-destination-modal__footer-hint add-destination-modal__footer-hint--error">
              {saveError}
            </p>
          ) : null}
          <button
            type="button"
            className="add-destination-save"
            disabled={pendingSelectionCount === 0 || saving}
            onClick={() => void handleSave()}
          >
            {saving ? commonMessages.loading : commonMessages.save}
            {!saving && pendingSelectionCount > 0 ? ` (${pendingSelectionCount})` : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
