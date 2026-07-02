"use client";

import { useState } from "react";
import { ProfileDestinationEditModal } from "@/components/profile/ProfileDestinationEditModal";
import {
  ParkPagePinEditLink,
  ParkPagePinEditTrigger,
} from "@/components/park/ParkPagePinEdit";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

export {
  ParkPagePinEditLink as CountryPagePinEditLink,
  ParkPagePinEditTrigger as CountryPagePinEditTrigger,
};

type CountryPagePinEditProps = {
  ownerCity: VisitedCity | null;
  ownerPark: VisitedPark | null;
  visitedCountries: VisitedCountry[];
  label: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CountryPagePinEdit({
  ownerCity,
  ownerPark,
  visitedCountries,
  label,
  open: controlledOpen,
  onOpenChange,
}: CountryPagePinEditProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && onOpenChange !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? onOpenChange : setUncontrolledOpen;
  const canEdit = Boolean(ownerCity || ownerPark);

  if (!canEdit) return null;

  return (
    <>
      <button type="button" className="city-page__edit-pin" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <ProfileDestinationEditModal
          city={ownerCity}
          park={ownerPark}
          visitedCountries={visitedCountries}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
