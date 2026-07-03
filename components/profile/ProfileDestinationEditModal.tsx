"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CityForm } from "@/components/dashboard/CityForm";
import { ParkForm } from "@/components/dashboard/ParkForm";
import { cityMessages, parkMessages, saveDestinationMessages } from "@/lib/i18n/client-messages";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

type ProfileDestinationEditModalProps = {
  city: VisitedCity | null;
  park: VisitedPark | null;
  visitedCountries: VisitedCountry[];
  onClose: () => void;
  mediaFocus?: "photo" | "instagram";
};

export function ProfileDestinationEditModal({
  city,
  park,
  visitedCountries,
  onClose,
  mediaFocus,
}: ProfileDestinationEditModalProps) {
  const router = useRouter();
  const open = Boolean(city || park);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const title = city ? cityMessages.edit : parkMessages.edit;

  function handleSuccess() {
    onClose();
    router.refresh();
  }

  return (
    <div className="save-destination-modal" role="presentation">
      <button
        type="button"
        className="save-destination-modal__backdrop"
        aria-label={saveDestinationMessages.close}
        onClick={onClose}
      />
      <div
        className="save-destination-modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-destination-edit-title"
      >
        <div className="save-destination-modal__header">
          <div>
            <h2 id="profile-destination-edit-title" className="save-destination-modal__title">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="save-destination-modal__close"
            onClick={onClose}
            aria-label={saveDestinationMessages.close}
          >
            ✕
          </button>
        </div>
        <div className="save-destination-modal__edit-panel scrollbar-thin">
          {city ? (
            <CityForm
              city={city}
              visitedCountries={visitedCountries}
              onSuccess={handleSuccess}
              onCancel={onClose}
              mediaFocus={mediaFocus}
            />
          ) : park ? (
            <ParkForm
              park={park}
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
