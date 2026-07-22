"use client";

import { useEffect, useState } from "react";
import { addCity, deleteCitiesBatch } from "@/lib/client/city-actions";
import { addWishlistCountry, removeWishlistCountry } from "@/lib/client/country-actions";
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthGate } from "@/components/auth/useAuthGate";
import type { CityVisitorState } from "@/lib/data/city-visitor-state";
import { HubPageLikeButton } from "@/components/hub/HubPageLikeButton";

type CityPageActionsProps = {
  cityName: string;
  countryCode: string;
  countryName: string;
  latitude: number | null;
  longitude: number | null;
  visitorState: CityVisitorState;
  loginHref: string;
  labels: {
    visited: string;
    wantToVisit: string;
    like: string;
    cityAdded: string;
    cityRemoved: string;
    wishlistAdded: string;
    wishlistRemoved: string;
    alreadyOnMap: string;
  };
};

export function CityPageActions({
  cityName,
  countryCode,
  countryName,
  latitude,
  longitude,
  visitorState: initialState,
  loginHref,
  labels,
}: CityPageActionsProps) {
  const modal = useModal();
  const toast = useToast();
  const authGate = useAuthGate();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState(initialState);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  const cityOnMap = Boolean(state.cityId);
  const onWishlist = Boolean(state.countryWishlistId);
  const wishlistDisabled = state.countryVisited || cityOnMap;

  async function handleBeenHere() {
    if (!state.isLoggedIn) {
      authGate.requireLogin();
      return;
    }
    if (busy) return;

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
          ...(latitude != null && longitude != null
            ? { latitude, longitude }
            : {}),
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

  async function handleWantToVisit() {
    if (!state.isLoggedIn) {
      authGate.requireLogin();
      return;
    }
    if (busy || wishlistDisabled) return;

    setBusy(true);
    try {
      if (onWishlist && state.countryWishlistId) {
        const result = await removeWishlistCountry(state.countryWishlistId);
        if (!result.ok) {
          await modal.alert(result.error, { variant: "error" });
          return;
        }
        toast.show(labels.wishlistRemoved);
      } else {
        const result = await addWishlistCountry(countryCode);
        if (!result.ok) {
          await modal.alert(result.error, { variant: "error" });
          return;
        }
        toast.show(labels.wishlistAdded);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="city-page__actions">
      <label
        className={`city-page__btn city-page__btn--visited ${cityOnMap ? "city-page__btn--active" : ""}`}
      >
        <input
          type="checkbox"
          className="city-page__btn-check"
          checked={cityOnMap}
          disabled={busy}
          onChange={() => void handleBeenHere()}
          aria-label={labels.visited}
        />
        <span>{labels.visited}</span>
      </label>
      <div className="city-page__actions-secondary">
        <label
          className={`city-page__btn city-page__btn--wish ${onWishlist ? "city-page__btn--active" : ""}`}
        >
          <input
            type="checkbox"
            className="city-page__btn-check city-page__btn-check--wish"
            checked={onWishlist}
            disabled={busy || wishlistDisabled}
            onChange={() => void handleWantToVisit()}
            aria-label={labels.wantToVisit}
          />
          <span>{labels.wantToVisit}</span>
        </label>
        <HubPageLikeButton
          label={labels.like}
          loginHref={loginHref}
          isLoggedIn={state.isLoggedIn}
          disabled={busy}
        />
      </div>
    </div>
  );
}
