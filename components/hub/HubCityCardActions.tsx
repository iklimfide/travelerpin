"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [state, setState] = useState(initialState);
  const [liked, setLiked] = useState(false);
  const [optimisticCityOnMap, setOptimisticCityOnMap] = useState<boolean | null>(null);
  const [optimisticWishlist, setOptimisticWishlist] = useState<boolean | null>(null);
  const [pendingVisited, setPendingVisited] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
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

  const requireLogin = useCallback(() => {
    if (!state.isLoggedIn) {
      authGate.requireLogin();
      return true;
    }
    return false;
  }, [authGate, state.isLoggedIn]);

  function handleBeenHere() {
    if (requireLogin() || pendingVisited) return;

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
      setPendingVisited(true);

      void deleteCitiesBatch({ ids: [prevId] }).then(async (result) => {
        setPendingVisited(false);
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
    setPendingVisited(true);

    void addCity({
      city_name: cityName,
      country_code: countryCode,
      country_name: countryName,
      ...(latitude != null && longitude != null ? { latitude, longitude } : {}),
    }).then(async (result) => {
      setPendingVisited(false);
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

  function handleSave() {
    if (requireLogin() || pendingSave || wishlistDisabled) return;

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
      setPendingSave(true);

      void removeWishlistCountry(prevId).then(async (result) => {
        setPendingSave(false);
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
    setPendingSave(true);

    void addWishlistCountry(countryCode).then(async (result) => {
      setPendingSave(false);
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

  function handleLike() {
    if (requireLogin()) return;
    setLiked((current) => !current);
  }

  return (
    <>
      <ActionButton
        label={labels.save}
        active={onWishlist}
        disabled={pendingSave || wishlistDisabled}
        onClick={handleSave}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill={onWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </ActionButton>
      <ActionButton
        label={labels.beenHere}
        active={cityOnMap}
        disabled={pendingVisited}
        onClick={handleBeenHere}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </ActionButton>
      <ActionButton label={labels.like} active={liked} onClick={handleLike}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
        </svg>
      </ActionButton>
    </>
  );
}
