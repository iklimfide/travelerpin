"use client";

import { useEffect, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState(initialState);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  const parkOnMap = Boolean(state.parkId);
  const onWishlist = Boolean(state.countryWishlistId);
  const wishlistDisabled = state.countryVisited || parkOnMap;

  async function handleBeenHere() {
    if (!state.isLoggedIn) {
      authGate.requireLogin();
      return;
    }
    if (busy) return;

    setBusy(true);
    try {
      if (parkOnMap && state.parkId) {
        const result = await deleteParksBatch({ ids: [state.parkId] });
        if (!result.ok) {
          await modal.alert(result.error ?? "Failed to remove park", { variant: "error" });
          return;
        }
        setState((current) => ({ ...current, parkId: null }));
        toast.show(labels.parkRemoved);
      } else {
        const result = await addPark({
          park_name: parkName,
          park_type: parkType,
          country_code: countryCode,
          country_name: countryName,
          ...(latitude != null && longitude != null ? { latitude, longitude } : {}),
        });

        if (!result.ok) {
          await modal.alert(result.error, { variant: "error" });
          return;
        }

        const park = result.park as { id?: string };
        setState((current) => ({
          ...current,
          parkId: park.id ?? current.parkId,
          countryVisited: true,
          countryWishlistId: null,
        }));
        toast.show(labels.parkAdded);
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
        className={`city-page__btn city-page__btn--visited ${parkOnMap ? "city-page__btn--active" : ""}`}
      >
        <input
          type="checkbox"
          className="city-page__btn-check"
          checked={parkOnMap}
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
