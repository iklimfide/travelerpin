"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CityForm } from "@/components/dashboard/CityForm";
import { CountryForm } from "@/components/dashboard/CountryForm";
import { ParkForm } from "@/components/dashboard/ParkForm";
import { cityMessages, countryMessages, parkMessages, shareMessages } from "@/lib/i18n/client-messages";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

type ProfileDestinationEditModalProps = {
  city: VisitedCity | null;
  park: VisitedPark | null;
  countryCode?: string | null;
  countryBackingCity?: VisitedCity | null;
  visitedCountries: VisitedCountry[];
  onClose: () => void;
  mediaFocus?: "photo" | "instagram";
};

export function ProfileDestinationEditModal({
  city,
  park,
  countryCode = null,
  countryBackingCity = null,
  visitedCountries,
  onClose,
  mediaFocus,
}: ProfileDestinationEditModalProps) {
  const router = useRouter();
  const open = Boolean(city || park || countryCode);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const title = city ? cityMessages.edit : park ? parkMessages.edit : countryMessages.edit;

  function handleSuccess() {
    onClose();
    router.refresh();
  }

  return (
    <div className="profile-followers-modal profile-destination-edit-modal" role="presentation">
      <button
        type="button"
        className="profile-followers-modal__backdrop"
        aria-label={shareMessages.close}
        onClick={onClose}
      />
      <div
        className="profile-followers-modal__sheet profile-all-destinations-modal__sheet profile-destination-edit-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-destination-edit-title"
      >
        <div className="profile-destination-edit-modal__head">
          <h2 id="profile-destination-edit-title" className="profile-followers-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="profile-followers-modal__close"
            onClick={onClose}
            aria-label={shareMessages.close}
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="profile-all-destinations-modal__body profile-destination-edit-modal__body scrollbar-thin">
          {city ? (
            <CityForm
              city={city}
              visitedCountries={visitedCountries}
              onSuccess={handleSuccess}
              onCancel={onClose}
              mediaFocus={mediaFocus}
              hideHeader
            />
          ) : park ? (
            <ParkForm
              park={park}
              visitedCountries={visitedCountries}
              onSuccess={handleSuccess}
              onCancel={onClose}
              mediaFocus={mediaFocus}
              hideHeader
            />
          ) : countryCode ? (
            <CountryForm
              countryCode={countryCode}
              backingCity={countryBackingCity}
              visitedCountries={visitedCountries}
              onSuccess={handleSuccess}
              onCancel={onClose}
              mediaFocus={mediaFocus}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
