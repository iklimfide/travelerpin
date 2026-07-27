"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CountryPickerStep } from "@/components/add/CountryPickerStep";
import { CityPickerStep, citySelectionKey } from "@/components/add/CityPickerStep";
import {
  NEXT_ROUTE_CHANGED_EVENT,
  PROFILE_DATA_STALE_EVENT,
  readOwnNextRouteCache,
} from "@/lib/client/session-page-cache";
import {
  fetchNextRoute,
  mergePendingNextRouteStops,
  persistNextRouteStops,
  routeCityKeys,
  routeCountryCodes,
} from "@/lib/client/next-route-state";
import { useToast } from "@/components/ui/ToastProvider";
import { useLockBodyScroll } from "@/lib/hooks/useLockBodyScroll";
import {
  getAddRegionForCountryCode,
  type AddRegionId,
} from "@/lib/add/countries-by-region";
import { useAppMessages } from "@/lib/i18n/client-messages";
import type { CountryOption } from "@/lib/data/countries";
import { isUkNationCode, isUkNationVisited, matchesUkCityCountry } from "@/lib/data/uk-nations";
import { citiesAreSame } from "@/lib/utils/city-aliases";
import { formatKnownPlaceName } from "@/lib/utils/city-name";
import type { NextRouteStop } from "@/types/database";
import { AddDestinationCountryPickerSkeleton } from "@/components/skeletons/AddDestinationModalSkeleton";
import "./add-destination.css";

type NextRouteDestinationModalProps = {
  onClose: () => void;
};

type Step =
  | { kind: "countries" }
  | { kind: "cities"; countryCode: string; countryName: string };

export function NextRouteDestinationModal({ onClose }: NextRouteDestinationModalProps) {
  const { common: commonMessages, nextRouteDestination: nextRouteDestinationMessages, addDestination: addDestinationMessages } = useAppMessages();
  const cachedRoute = readOwnNextRouteCache();
  const [step, setStep] = useState<Step>({ kind: "countries" });
  const [routeStops, setRouteStops] = useState<NextRouteStop[]>(() => cachedRoute?.stops ?? []);
  const [routeCountryCodeSet, setRouteCountryCodeSet] = useState<Set<string>>(
    () => (cachedRoute ? routeCountryCodes(cachedRoute.stops) : new Set())
  );
  const [routeCityKeySet, setRouteCityKeySet] = useState<Set<string>>(
    () => (cachedRoute ? routeCityKeys(cachedRoute.stops) : new Set())
  );
  const [pendingCountryCodes, setPendingCountryCodes] = useState<Set<string>>(new Set());
  const [pendingCityKeys, setPendingCityKeys] = useState<Set<string>>(new Set());
  const [returnExpandedRegion, setReturnExpandedRegion] = useState<AddRegionId | null>(null);
  const [loadingState, setLoadingState] = useState(() => cachedRoute === null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const toast = useToast();
  const hasRouteStateRef = useRef(cachedRoute !== null);

  useLockBodyScroll(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const applyRouteStops = useCallback((stops: NextRouteStop[]) => {
    setRouteStops(stops);
    setRouteCountryCodeSet(routeCountryCodes(stops));
    setRouteCityKeySet(routeCityKeys(stops));
  }, []);

  const loadRouteState = useCallback(async (options?: { background?: boolean; force?: boolean }) => {
    const background = options?.background ?? hasRouteStateRef.current;
    if (!background) {
      setLoadingState(true);
    }

    const result = await fetchNextRoute({
      preferCache: !options?.force,
      force: options?.force,
    });

    if (result.ok) {
      applyRouteStops(result.route.stops);
      hasRouteStateRef.current = true;
    }

    if (!background) {
      setLoadingState(false);
    }
  }, [applyRouteStops]);

  useEffect(() => {
    hasRouteStateRef.current = readOwnNextRouteCache() !== null;
    setStep({ kind: "countries" });
    setPendingCountryCodes(new Set());
    setPendingCityKeys(new Set());
    setReturnExpandedRegion(null);
    setSaveError(null);

    const cached = readOwnNextRouteCache();
    if (cached !== null) {
      applyRouteStops(cached.stops);
      setLoadingState(false);
      return;
    }

    void loadRouteState({ background: false });
  }, [loadRouteState, applyRouteStops]);

  useEffect(() => {
    function onProfileStale() {
      void loadRouteState({ background: true, force: true });
    }

    function onRouteChanged(event: Event) {
      const detail = (event as CustomEvent<{ stops?: NextRouteStop[] }>).detail;
      if (!detail?.stops) return;
      applyRouteStops(detail.stops);
      hasRouteStateRef.current = true;
    }

    window.addEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
    window.addEventListener(NEXT_ROUTE_CHANGED_EVENT, onRouteChanged);
    return () => {
      window.removeEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
      window.removeEventListener(NEXT_ROUTE_CHANGED_EVENT, onRouteChanged);
    };
  }, [applyRouteStops, loadRouteState]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const existingCityNames = useMemo(() => {
    if (step.kind !== "cities") return [];
    const code = step.countryCode.toUpperCase();
    return routeStops
      .filter(
        (stop) =>
          stop.kind === "city" &&
          stop.countryCode &&
          matchesUkCityCountry(stop.countryCode, code)
      )
      .map((stop) => stop.name);
  }, [routeStops, step]);

  const pendingSelectionCount = useMemo(() => {
    const newCountries = [...pendingCountryCodes].filter((code) => {
      const normalized = code.toUpperCase();
      return isUkNationCode(normalized)
        ? !isUkNationVisited(normalized, routeCountryCodeSet)
        : !routeCountryCodeSet.has(normalized);
    }).length;

    const newCities = [...pendingCityKeys].filter((key) => !routeCityKeySet.has(key)).length;
    return newCountries + newCities;
  }, [pendingCityKeys, pendingCountryCodes, routeCityKeySet, routeCountryCodeSet]);

  function isCountryOnRoute(code: string): boolean {
    const normalized = code.toUpperCase();
    return isUkNationCode(normalized)
      ? isUkNationVisited(normalized, routeCountryCodeSet)
      : routeCountryCodeSet.has(normalized);
  }

  function handleToggleCountry(country: CountryOption) {
    const code = country.code.toUpperCase();
    if (isCountryOnRoute(code)) return;

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
      kind: "cities",
      countryCode: country.code,
      countryName: formatKnownPlaceName(country.name),
    });
  }

  function handleToggleCity(city: {
    countryCode: string;
    name: string;
  }) {
    const key = citySelectionKey(city.countryCode, city.name);
    if (routeCityKeySet.has(key)) return;

    setPendingCityKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSave() {
    if (pendingSelectionCount === 0) return;

    const { stops: nextStops, savedCount } = mergePendingNextRouteStops({
      existingStops: routeStops,
      pendingCountryCodes,
      pendingCityKeys,
    });

    if (savedCount === 0) {
      setPendingCountryCodes(new Set());
      setPendingCityKeys(new Set());
      return;
    }

    const cached = readOwnNextRouteCache();
    const previousRoute = cached ?? { stops: routeStops };
    applyRouteStops(nextStops);
    setPendingCountryCodes(new Set());
    setPendingCityKeys(new Set());
    setSaveError(null);
    onClose();

    persistNextRouteStops(nextStops, {
      previousRoute: { ...previousRoute, stops: routeStops },
      onError: (message) => {
        toast.show(
          message.toLowerCase().includes("unauthorized")
            ? nextRouteDestinationMessages.loginRequired
            : message || nextRouteDestinationMessages.saveFailed,
          2500
        );
      },
    });
  }

  if (!mounted) return null;

  return createPortal(
    <div className="add-destination-modal" role="presentation">
      <button
        type="button"
        className="add-destination-modal__backdrop"
        aria-label={nextRouteDestinationMessages.close}
        onClick={onClose}
      />
      <div
        className="add-destination-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="next-route-destination-title"
      >
        <div
          className={`add-destination-modal__header${
            step.kind === "cities" ? " add-destination-modal__header--cities" : ""
          }`}
        >
          {step.kind === "countries" ? (
            <h2 id="next-route-destination-title" className="add-destination-modal__title">
              {nextRouteDestinationMessages.selectCountryTitle}
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
              <h2 id="next-route-destination-title" className="sr-only">
                {step.countryName}
              </h2>
            </>
          )}
          <button
            type="button"
            className="add-destination-modal__close"
            aria-label={nextRouteDestinationMessages.close}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="add-destination-modal__body">
          {loadingState && step.kind === "countries" ? (
            <AddDestinationCountryPickerSkeleton />
          ) : step.kind === "countries" ? (
            <CountryPickerStep
              visitedCodes={routeCountryCodeSet}
              pendingCountryCodes={pendingCountryCodes}
              onToggleCountry={handleToggleCountry}
              onOpenCountry={handleOpenCountry}
              initialExpandedRegion={returnExpandedRegion}
            />
          ) : (
            <CityPickerStep
              countryCode={step.countryCode}
              countryName={step.countryName}
              existingCityNames={existingCityNames}
              pendingCityKeys={pendingCityKeys}
              onToggleCity={handleToggleCity}
              existingCityHint={nextRouteDestinationMessages.cityOnRoute}
            />
          )}
        </div>

        <div className="add-destination-modal__footer">
          <p
            className={`add-destination-modal__footer-hint${
              saveError ? " add-destination-modal__footer-hint--error" : ""
            }`}
          >
            {saveError ?? nextRouteDestinationMessages.saveHint}
          </p>
          <button
            type="button"
            className="add-destination-save"
            disabled={pendingSelectionCount === 0}
            onClick={handleSave}
          >
            {commonMessages.save}
            {pendingSelectionCount > 0 ? ` (${pendingSelectionCount})` : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
