"use client";

import { useEffect, useRef, useState } from "react";
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
  const [state, setState] = useState(initialState);
  const [optimisticCityOnMap, setOptimisticCityOnMap] = useState<boolean | null>(null);
  const [optimisticWishlist, setOptimisticWishlist] = useState<boolean | null>(null);
  const cityAddToken = useRef(0);
  const wishlistAddToken = useRef(0);

  useEffect(() => {
    setState(initialState);
    setOptimisticCityOnMap(null);
    setOptimisticWishlist(null);
  }, [initialState]);

  const cityOnMap =
    optimisticCityOnMap !== null ? optimisticCityOnMap : Boolean(state.cityId);
  const onWishlist =
    optimisticWishlist !== null ? optimisticWishlist : Boolean(state.countryWishlistId);
  const wishlistDisabled = state.countryVisited || cityOnMap;

  function handleBeenHere() {
    if (!state.isLoggedIn) {
      authGate.requireLogin();
      return;
    }

    if (cityOnMap) {
      if (!state.cityId) {
        cityAddToken.current += 1;
        setOptimisticCityOnMap(false);
        setState((current) => ({ ...current, cityId: null }));
        toast.show(labels.cityRemoved);
        return;
      }

      const prevId = state.cityId;
      setOptimisticCityOnMap(false);
      setState((current) => ({ ...current, cityId: null }));
      toast.show(labels.cityRemoved);

      void deleteCitiesBatch({ ids: [prevId] }).then(async (result) => {
        if (!result.ok) {
          setOptimisticCityOnMap(null);
          setState((current) => ({ ...current, cityId: prevId }));
          await modal.alert(result.error ?? "Failed to remove city", { variant: "error" });
          return;
        }
        setOptimisticCityOnMap(null);
      });
      return;
    }

    const token = ++cityAddToken.current;
    setOptimisticCityOnMap(true);
    setOptimisticWishlist(false);
    setState((current) => ({
      ...current,
      cityId: "pending",
      countryVisited: true,
      countryWishlistId: null,
    }));
    toast.show(labels.cityAdded);

    void addCity({
      city_name: cityName,
      country_code: countryCode,
      country_name: countryName,
      ...(latitude != null && longitude != null ? { latitude, longitude } : {}),
    }).then(async (result) => {
      if (token !== cityAddToken.current) {
        if (result.ok) {
          const city = result.city as { id?: string };
          if (city.id) void deleteCitiesBatch({ ids: [city.id] });
        }
        return;
      }

      if (!result.ok) {
        setOptimisticCityOnMap(null);
        setState((current) => ({
          ...current,
          cityId: null,
          countryVisited: initialState.countryVisited,
        }));
        if (result.error.toLowerCase().includes("already")) {
          await modal.alert(labels.alreadyOnMap, { variant: "info" });
        } else {
          await modal.alert(result.error, { variant: "error" });
        }
        return;
      }

      const city = result.city as { id?: string };
      setOptimisticCityOnMap(null);
      setState((current) => ({
        ...current,
        cityId: city.id ?? current.cityId,
        countryVisited: true,
        countryWishlistId: null,
      }));
    });
  }

  function handleWantToVisit() {
    if (!state.isLoggedIn) {
      authGate.requireLogin();
      return;
    }
    if (wishlistDisabled) return;

    if (onWishlist) {
      if (!state.countryWishlistId) {
        wishlistAddToken.current += 1;
        setOptimisticWishlist(false);
        toast.show(labels.wishlistRemoved);
        return;
      }

      const prevId = state.countryWishlistId;
      setOptimisticWishlist(false);
      setState((current) => ({ ...current, countryWishlistId: null }));
      toast.show(labels.wishlistRemoved);

      void removeWishlistCountry(prevId).then(async (result) => {
        if (!result.ok) {
          setOptimisticWishlist(null);
          setState((current) => ({ ...current, countryWishlistId: prevId }));
          await modal.alert(result.error, { variant: "error" });
        }
      });
      return;
    }

    const token = ++wishlistAddToken.current;
    setOptimisticWishlist(true);
    toast.show(labels.wishlistAdded);

    void addWishlistCountry(countryCode).then(async (result) => {
      if (token !== wishlistAddToken.current) {
        if (result.ok) void removeWishlistCountry(result.id);
        return;
      }

      if (!result.ok) {
        setOptimisticWishlist(null);
        await modal.alert(result.error, { variant: "error" });
        return;
      }

      setOptimisticWishlist(null);
      setState((current) => ({ ...current, countryWishlistId: result.id }));
    });
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
          onChange={handleBeenHere}
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
            disabled={wishlistDisabled}
            onChange={handleWantToVisit}
            aria-label={labels.wantToVisit}
          />
          <span>{labels.wantToVisit}</span>
        </label>
        <HubPageLikeButton
          label={labels.like}
          loginHref={loginHref}
          isLoggedIn={state.isLoggedIn}
        />
      </div>
    </div>
  );
}
