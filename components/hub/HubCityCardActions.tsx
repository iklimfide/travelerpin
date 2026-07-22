"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { addCity, deleteCitiesBatch } from "@/lib/client/city-actions";
import { addWishlistCountry, removeWishlistCountry } from "@/lib/client/country-actions";
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthGate } from "@/components/auth/useAuthGate";
import type { CityVisitorState } from "@/lib/data/city-visitor-state";

type HubCityCardActionsProps = {
  cityName: string;
  countryCode: string;
  countryName: string;
  latitude: number | null;
  longitude: number | null;
  visitorState: CityVisitorState;
  loginHref: string;
  labels: {
    save: string;
    beenHere: string;
    like: string;
    cityAdded: string;
    cityRemoved: string;
    wishlistAdded: string;
    wishlistRemoved: string;
    alreadyOnMap: string;
  };
};

function ActionButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`hub-place-card__action-btn${active ? " hub-place-card__action-btn--active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

export function HubCityCardActions({
  cityName,
  countryCode,
  countryName,
  latitude,
  longitude,
  visitorState: initialState,
  loginHref,
  labels,
}: HubCityCardActionsProps) {
  const modal = useModal();
  const toast = useToast();
  const authGate = useAuthGate();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState(initialState);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  const cityOnMap = Boolean(state.cityId);
  const onWishlist = Boolean(state.countryWishlistId);
  const wishlistDisabled = state.countryVisited || cityOnMap;

  const requireLogin = useCallback(() => {
    if (!state.isLoggedIn) {
      authGate.requireLogin();
      return true;
    }
    return false;
  }, [authGate, state.isLoggedIn]);

  async function handleBeenHere() {
    if (requireLogin() || busy) return;

    setBusy(true);
    try {
      if (cityOnMap && state.cityId) {
        const result = await deleteCitiesBatch({ ids: [state.cityId] });
        if (!result.ok) {
          await modal.alert(result.error ?? "Failed to remove city", { variant: "error" });
          return;
        }
        setState((current) => ({ ...current, cityId: null }));
        toast.show(labels.cityRemoved);
      } else {
        const result = await addCity({
          city_name: cityName,
          country_code: countryCode,
          country_name: countryName,
          ...(latitude != null && longitude != null ? { latitude, longitude } : {}),
        });

        if (!result.ok) {
          if (result.error.toLowerCase().includes("already")) {
            await modal.alert(labels.alreadyOnMap, { variant: "info" });
          } else {
            await modal.alert(result.error, { variant: "error" });
          }
          return;
        }

        const city = result.city as { id?: string };
        setState((current) => ({
          ...current,
          cityId: city.id ?? current.cityId,
          countryVisited: true,
          countryWishlistId: null,
        }));
        toast.show(labels.cityAdded);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (requireLogin() || busy || wishlistDisabled) return;

    setBusy(true);
    try {
      if (onWishlist && state.countryWishlistId) {
        const result = await removeWishlistCountry(state.countryWishlistId);
        if (!result.ok) {
          await modal.alert(result.error, { variant: "error" });
          return;
        }
        setState((current) => ({ ...current, countryWishlistId: null }));
        toast.show(labels.wishlistRemoved);
      } else {
        const result = await addWishlistCountry(countryCode);
        if (!result.ok) {
          await modal.alert(result.error, { variant: "error" });
          return;
        }
        setState((current) => ({ ...current, countryWishlistId: "saved" }));
        toast.show(labels.wishlistAdded);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleLike() {
    if (requireLogin()) return;
    setLiked((current) => !current);
  }

  return (
    <>
      <ActionButton
        label={labels.save}
        active={onWishlist}
        disabled={busy || wishlistDisabled}
        onClick={() => void handleSave()}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill={onWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </ActionButton>
      <ActionButton
        label={labels.beenHere}
        active={cityOnMap}
        disabled={busy}
        onClick={() => void handleBeenHere()}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </ActionButton>
      <ActionButton label={labels.like} active={liked} disabled={busy} onClick={handleLike}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
        </svg>
      </ActionButton>
    </>
  );
}
