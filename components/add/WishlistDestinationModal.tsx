"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CountryPickerStep } from "@/components/add/CountryPickerStep";
import {
  PROFILE_DATA_STALE_EVENT,
  TRAVEL_STATE_UPDATED_EVENT,
  readTravelStateCache,
  type TravelStateData,
} from "@/lib/client/session-page-cache";
import { fetchTravelState } from "@/lib/client/travel-state";
import { persistWishlistChanges } from "@/lib/client/wishlist-state";
import { useToast } from "@/components/ui/ToastProvider";
import { useAppMessages } from "@/lib/i18n/client-messages";
import type { CountryOption } from "@/lib/data/countries";
import { isUkNationCode, isUkNationVisited } from "@/lib/data/uk-nations";
import type { WishlistCountry } from "@/types/database";
import { AddDestinationCountryPickerSkeleton } from "@/components/skeletons/AddDestinationModalSkeleton";
import "./add-destination.css";

type WishlistDestinationModalProps = {
  onClose: () => void;
};

function wishlistCodesFromCountries(countries: WishlistCountry[]): Set<string> {
  return new Set(countries.map((country) => country.country_code.toUpperCase()));
}

function isCountryVisited(code: string, visitedCodes: ReadonlySet<string>): boolean {
  return isUkNationCode(code) ? isUkNationVisited(code, visitedCodes) : visitedCodes.has(code);
}

function isCountryOnWishlist(code: string, wishlistCodes: ReadonlySet<string>): boolean {
  return isUkNationCode(code) ? isUkNationVisited(code, wishlistCodes) : wishlistCodes.has(code);
}

export function WishlistDestinationModal({ onClose }: WishlistDestinationModalProps) {
  const { common: commonMessages, wishlist: wishlistMessages, wishlistDestination: wishlistDestinationMessages } = useAppMessages();
  const cached = readTravelStateCache();
  const [wishlistCountries, setWishlistCountries] = useState<WishlistCountry[]>(
    () => cached?.wishlistCountries ?? []
  );
  const [wishlistCodes, setWishlistCodes] = useState<Set<string>>(
    () => wishlistCodesFromCountries(cached?.wishlistCountries ?? [])
  );
  const [visitedCodes, setVisitedCodes] = useState<Set<string>>(
    () => new Set((cached?.visitedCodes ?? []).map((code) => code.toUpperCase()))
  );
  const [pendingCountryCodes, setPendingCountryCodes] = useState<Set<string>>(new Set());
  const [pendingRemoveCountryCodes, setPendingRemoveCountryCodes] = useState<Set<string>>(new Set());
  const [loadingState, setLoadingState] = useState(() => !cached);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const toast = useToast();
  const hasStateRef = useRef(Boolean(cached));

  useEffect(() => {
    setMounted(true);
  }, []);

  const applyTravelData = useCallback((data: TravelStateData) => {
    const wishlist = wishlistCodesFromCountries(data.wishlistCountries);
    const visited = new Set(data.visitedCodes.map((code) => code.toUpperCase()));

    setWishlistCountries(data.wishlistCountries);
    setWishlistCodes(wishlist);
    setVisitedCodes(visited);
  }, []);

  const loadState = useCallback(async (options?: { background?: boolean; force?: boolean }) => {
    const background = options?.background ?? hasStateRef.current;
    if (!background) {
      setLoadingState(true);
    }

    const result = await fetchTravelState({
      preferCache: !options?.force,
      force: options?.force,
    });

    if (result.ok) {
      applyTravelData(result.data);
      hasStateRef.current = true;
    }

    if (!background) {
      setLoadingState(false);
    }
  }, [applyTravelData]);

  useEffect(() => {
    hasStateRef.current = Boolean(readTravelStateCache());
    setPendingCountryCodes(new Set());
    setPendingRemoveCountryCodes(new Set());
    setSaveError(null);

    const hit = readTravelStateCache();
    if (hit) {
      applyTravelData(hit);
      setLoadingState(false);
      return;
    }

    void loadState({ background: false });
  }, [loadState, applyTravelData]);

  useEffect(() => {
    function onProfileStale() {
      void loadState({ background: true, force: true });
    }

    function onTravelStateUpdated(event: Event) {
      const detail = (event as CustomEvent<{ data: TravelStateData }>).detail;
      if (!detail?.data) return;
      applyTravelData(detail.data);
      hasStateRef.current = true;
    }

    window.addEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
    window.addEventListener(TRAVEL_STATE_UPDATED_EVENT, onTravelStateUpdated);
    return () => {
      window.removeEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
      window.removeEventListener(TRAVEL_STATE_UPDATED_EVENT, onTravelStateUpdated);
    };
  }, [applyTravelData, loadState]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const pendingSelectionCount = useMemo(() => {
    const pendingAdds = [...pendingCountryCodes].filter((code) => {
      const normalized = code.toUpperCase();
      return !isCountryOnWishlist(normalized, wishlistCodes) && !isCountryVisited(normalized, visitedCodes);
    }).length;

    const pendingRemoves = [...pendingRemoveCountryCodes].filter((code) =>
      isCountryOnWishlist(code.toUpperCase(), wishlistCodes)
    ).length;

    return pendingAdds + pendingRemoves;
  }, [pendingCountryCodes, pendingRemoveCountryCodes, visitedCodes, wishlistCodes]);

  function handleToggleCountry(country: CountryOption) {
    const code = country.code.toUpperCase();
    if (isCountryVisited(code, visitedCodes)) return;

    if (isCountryOnWishlist(code, wishlistCodes)) {
      setPendingCountryCodes((prev) => {
        if (!prev.has(code)) return prev;
        const next = new Set(prev);
        next.delete(code);
        return next;
      });

      setPendingRemoveCountryCodes((prev) => {
        const next = new Set(prev);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        return next;
      });
      return;
    }

    setPendingRemoveCountryCodes((prev) => {
      if (!prev.has(code)) return prev;
      const next = new Set(prev);
      next.delete(code);
      return next;
    });

    setPendingCountryCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleSave() {
    if (pendingSelectionCount === 0) return;

    const pendingAdds = new Set(pendingCountryCodes);
    const pendingRemoves = new Set(pendingRemoveCountryCodes);

    setPendingCountryCodes(new Set());
    setPendingRemoveCountryCodes(new Set());
    setSaveError(null);
    onClose();

    persistWishlistChanges(
      {
        pendingCountryCodes: pendingAdds,
        pendingRemoveCountryCodes: pendingRemoves,
        wishlistCountries,
        wishlistCodes,
        visitedCodes,
      },
      {
        onError: (message) => {
          toast.show(
            message.toLowerCase().includes("unauthorized")
              ? wishlistDestinationMessages.loginRequired
              : message || wishlistDestinationMessages.saveFailed,
            2500
          );
        },
      }
    );
  }

  if (!mounted) return null;

  return createPortal(
    <div className="add-destination-modal" role="presentation">
      <button
        type="button"
        className="add-destination-modal__backdrop"
        aria-label={wishlistDestinationMessages.close}
        onClick={onClose}
      />
      <div
        className="add-destination-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wishlist-destination-title"
      >
        <div className="add-destination-modal__header">
          <h2 id="wishlist-destination-title" className="add-destination-modal__title">
            {wishlistDestinationMessages.selectCountryTitle}
          </h2>
          <button
            type="button"
            className="add-destination-modal__close"
            aria-label={wishlistDestinationMessages.close}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="add-destination-modal__body">
          {loadingState ? (
            <AddDestinationCountryPickerSkeleton />
          ) : (
            <CountryPickerStep
              visitedCodes={visitedCodes}
              activeCountryCodes={wishlistCodes}
              countedCodes={wishlistCodes}
              pendingCountryCodes={pendingCountryCodes}
              pendingRemoveCountryCodes={pendingRemoveCountryCodes}
              onToggleCountry={handleToggleCountry}
              onOpenCountry={handleToggleCountry}
              countriesOnly
              searchPlaceholder={wishlistMessages.searchPlaceholder}
              regionProgressSuffix="on wishlist"
              visitedCountryHint={wishlistDestinationMessages.alreadyVisited}
            />
          )}
        </div>

        <div className="add-destination-modal__footer">
          <p
            className={`add-destination-modal__footer-hint${
              saveError ? " add-destination-modal__footer-hint--error" : ""
            }`}
          >
            {saveError ?? wishlistDestinationMessages.saveHint}
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
