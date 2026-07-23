"use client";

import { useEffect, useRef, useState } from "react";
import { addPark, deleteParksBatch } from "@/lib/client/park-actions";
import { addWishlistCountry, removeWishlistCountry } from "@/lib/client/country-actions";
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthGate } from "@/components/auth/useAuthGate";
import type { ParkVisitorState } from "@/lib/data/park-visitor-state";
import type { ParkType } from "@/lib/data/tourist-park-search";
import { HubPageLikeButton } from "@/components/hub/HubPageLikeButton";

type ParkPageActionsProps = {
  parkName: string;
  parkType: ParkType;
  countryCode: string;
  countryName: string;
  latitude?: number | null;
  longitude?: number | null;
  visitorState: ParkVisitorState;
  loginHref: string;
  labels: {
    visited: string;
    wantToVisit: string;
    like: string;
    parkAdded: string;
    parkRemoved: string;
    wishlistAdded: string;
    wishlistRemoved: string;
  };
};

export function ParkPageActions({
  parkName,
  parkType,
  countryCode,
  countryName,
  latitude,
  longitude,
  visitorState: initialState,
  loginHref,
  labels,
}: ParkPageActionsProps) {
  const modal = useModal();
  const toast = useToast();
  const authGate = useAuthGate();
  const [state, setState] = useState(initialState);
  const [optimisticParkOnMap, setOptimisticParkOnMap] = useState<boolean | null>(null);
  const [optimisticWishlist, setOptimisticWishlist] = useState<boolean | null>(null);
  const parkAddToken = useRef(0);
  const wishlistAddToken = useRef(0);

  useEffect(() => {
    setState(initialState);
    setOptimisticParkOnMap(null);
    setOptimisticWishlist(null);
  }, [initialState]);

  const parkOnMap =
    optimisticParkOnMap !== null ? optimisticParkOnMap : Boolean(state.parkId);
  const onWishlist =
    optimisticWishlist !== null ? optimisticWishlist : Boolean(state.countryWishlistId);
  const wishlistDisabled = state.countryVisited || parkOnMap;

  function handleBeenHere() {
    if (!state.isLoggedIn) {
      authGate.requireLogin();
      return;
    }

    if (parkOnMap) {
      if (!state.parkId) {
        parkAddToken.current += 1;
        setOptimisticParkOnMap(false);
        setState((current) => ({ ...current, parkId: null }));
        toast.show(labels.parkRemoved);
        return;
      }

      const prevId = state.parkId;
      setOptimisticParkOnMap(false);
      setState((current) => ({ ...current, parkId: null }));
      toast.show(labels.parkRemoved);

      void deleteParksBatch({ ids: [prevId] }).then(async (result) => {
        if (!result.ok) {
          setOptimisticParkOnMap(null);
          setState((current) => ({ ...current, parkId: prevId }));
          await modal.alert(result.error ?? "Failed to remove park", { variant: "error" });
          return;
        }
        setOptimisticParkOnMap(null);
      });
      return;
    }

    const token = ++parkAddToken.current;
    setOptimisticParkOnMap(true);
    setOptimisticWishlist(false);
    setState((current) => ({
      ...current,
      parkId: "pending",
      countryVisited: true,
      countryWishlistId: null,
    }));
    toast.show(labels.parkAdded);

    void addPark({
      park_name: parkName,
      park_type: parkType,
      country_code: countryCode,
      country_name: countryName,
      ...(latitude != null && longitude != null ? { latitude, longitude } : {}),
    }).then(async (result) => {
      if (token !== parkAddToken.current) {
        if (result.ok) {
          const park = result.park as { id?: string };
          if (park.id) void deleteParksBatch({ ids: [park.id] });
        }
        return;
      }

      if (!result.ok) {
        setOptimisticParkOnMap(null);
        setState((current) => ({
          ...current,
          parkId: null,
          countryVisited: initialState.countryVisited,
        }));
        await modal.alert(result.error, { variant: "error" });
        return;
      }

      const park = result.park as { id?: string };
      setOptimisticParkOnMap(null);
      setState((current) => ({
        ...current,
        parkId: park.id ?? current.parkId,
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
        className={`city-page__btn city-page__btn--visited ${parkOnMap ? "city-page__btn--active" : ""}`}
      >
        <input
          type="checkbox"
          className="city-page__btn-check"
          checked={parkOnMap}
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
