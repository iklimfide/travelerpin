"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  addVisitedCountry,
  addWishlistCountry,
  removeVisitedCountry,
  removeWishlistCountry,
} from "@/lib/client/country-actions";
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthGate } from "@/components/auth/useAuthGate";
import type { CountryVisitorState } from "@/lib/data/country-visitor-state";
import { isCountryRemoveBlockedByPlacesError } from "@/lib/utils/country-remove";
import { HubPageLikeButton } from "@/components/hub/HubPageLikeButton";
import { tapPressProps } from "@/lib/client/use-instant-action";

type CountryPageActionsProps = {
  countryCode: string;
  visitorState: CountryVisitorState;
  loginHref: string;
  labels: {
    visited: string;
    wantToVisit: string;
    like: string;
    countryAdded: string;
    countryRemoved: string;
    wishlistAdded: string;
    wishlistRemoved: string;
    removePlacesFirst: string;
  };
};

export function CountryPageActions({
  countryCode,
  visitorState: initialState,
  loginHref,
  labels,
}: CountryPageActionsProps) {
  const router = useRouter();
  const modal = useModal();
  const toast = useToast();
  const authGate = useAuthGate();
  const [state, setState] = useState(initialState);
  const [optimisticOnMap, setOptimisticOnMap] = useState<boolean | null>(null);
  const [optimisticWishlist, setOptimisticWishlist] = useState<boolean | null>(null);
  const visitedAddToken = useRef(0);
  const wishlistAddToken = useRef(0);

  useEffect(() => {
    setState(initialState);
    setOptimisticOnMap(null);
    setOptimisticWishlist(null);
  }, [initialState]);

  const onMap = state.visitedViaPlacesOnly
    ? true
    : optimisticOnMap !== null
      ? optimisticOnMap
      : state.isOnMap;
  const onWishlist =
    optimisticWishlist !== null ? optimisticWishlist : Boolean(state.wishlistId);
  const visitedLocked = state.visitedViaPlacesOnly;
  const wishlistDisabled = onMap;

  function refreshInBackground() {
    void Promise.resolve().then(() => router.refresh());
  }

  function handleVisited() {
    if (!state.isLoggedIn) {
      authGate.requireLogin();
      return;
    }
    if (state.visitedViaPlacesOnly) {
      toast.show(labels.removePlacesFirst);
      return;
    }

    if (onMap) {
      if (!state.visitedId) {
        visitedAddToken.current += 1;
        setOptimisticOnMap(false);
        setState((current) => ({ ...current, isOnMap: false }));
        toast.show(labels.countryRemoved);
        return;
      }

      const prevId = state.visitedId;
      const nextOnMap = state.visitedViaPlacesOnly;
      setOptimisticOnMap(nextOnMap);
      setState((current) => ({
        ...current,
        visitedId: null,
        isOnMap: nextOnMap,
      }));
      toast.show(labels.countryRemoved);

      void removeVisitedCountry(prevId).then(async (result) => {
        if (!result.ok) {
          setOptimisticOnMap(null);
          setState((current) => ({
            ...current,
            visitedId: prevId,
            isOnMap: true,
          }));
          if (isCountryRemoveBlockedByPlacesError(result.error)) {
            toast.show(labels.removePlacesFirst);
            return;
          }
          await modal.alert(result.error, { variant: "error" });
          return;
        }
        setOptimisticOnMap(null);
        refreshInBackground();
      });
      return;
    }

    const token = ++visitedAddToken.current;
    setOptimisticOnMap(true);
    setOptimisticWishlist(false);
    setState((current) => ({
      ...current,
      isOnMap: true,
      wishlistId: null,
    }));
    toast.show(labels.countryAdded);

    void addVisitedCountry(countryCode).then(async (result) => {
      if (token !== visitedAddToken.current) {
        if (result.ok) {
          void removeVisitedCountry(result.id);
        }
        return;
      }

      if (!result.ok) {
        setOptimisticOnMap(null);
        setState((current) => ({
          ...current,
          isOnMap: false,
        }));
        await modal.alert(result.error, { variant: "error" });
        return;
      }

      setOptimisticOnMap(null);
      setState((current) => ({
        ...current,
        visitedId: result.id,
        isOnMap: true,
      }));
      refreshInBackground();
    });
  }

  function handleWantToVisit() {
    if (!state.isLoggedIn) {
      authGate.requireLogin();
      return;
    }
    if (wishlistDisabled) return;

    if (onWishlist) {
      if (!state.wishlistId) {
        wishlistAddToken.current += 1;
        setOptimisticWishlist(false);
        toast.show(labels.wishlistRemoved);
        return;
      }

      const prevId = state.wishlistId;
      setOptimisticWishlist(false);
      setState((current) => ({ ...current, wishlistId: null }));
      toast.show(labels.wishlistRemoved);

      void removeWishlistCountry(prevId).then(async (result) => {
        if (!result.ok) {
          setOptimisticWishlist(null);
          setState((current) => ({ ...current, wishlistId: prevId }));
          await modal.alert(result.error, { variant: "error" });
          return;
        }
        refreshInBackground();
      });
      return;
    }

    const token = ++wishlistAddToken.current;
    setOptimisticWishlist(true);
    toast.show(labels.wishlistAdded);

    void addWishlistCountry(countryCode).then(async (result) => {
      if (token !== wishlistAddToken.current) {
        if (result.ok) {
          void removeWishlistCountry(result.id);
        }
        return;
      }

      if (!result.ok) {
        setOptimisticWishlist(null);
        await modal.alert(result.error, { variant: "error" });
        return;
      }

      setOptimisticWishlist(null);
      setState((current) => ({ ...current, wishlistId: result.id }));
      refreshInBackground();
    });
  }

  return (
    <div className="city-page__actions">
      <label
        className={`city-page__btn city-page__btn--visited ${onMap ? "city-page__btn--active" : ""}`}
        {...tapPressProps(visitedLocked)}
      >
        <input
          type="checkbox"
          className="city-page__btn-check"
          checked={onMap}
          disabled={visitedLocked}
          onChange={handleVisited}
          aria-label={labels.visited}
        />
        <span>{labels.visited}</span>
      </label>
      <div className="city-page__actions-secondary">
        <label
          className={`city-page__btn city-page__btn--wish ${onWishlist ? "city-page__btn--active" : ""}`}
          {...tapPressProps(wishlistDisabled)}
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
