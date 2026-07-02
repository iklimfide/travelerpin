"use client";

import { useState } from "react";
import { ProfileDestinationEditModal } from "@/components/profile/ProfileDestinationEditModal";
import {
  ParkPagePinEditLink,
  ParkPagePinEditTrigger,
} from "@/components/park/ParkPagePinEdit";
import type { VisitedCity, VisitedCountry } from "@/types/database";

export { ParkPagePinEditLink as CityPagePinEditLink, ParkPagePinEditTrigger as CityPagePinEditTrigger };

type CityPagePinEditProps = {
  ownerCity: VisitedCity;
  visitedCountries: VisitedCountry[];
  label: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CityPagePinEdit({
  ownerCity,
  visitedCountries,
  label,
  open: controlledOpen,
  onOpenChange,
}: CityPagePinEditProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && onOpenChange !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? onOpenChange : setUncontrolledOpen;

  return (
    <>
      <button type="button" className="city-page__edit-pin" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <ProfileDestinationEditModal
          city={ownerCity}
          park={null}
          visitedCountries={visitedCountries}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
