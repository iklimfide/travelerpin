"use client";

import { useState } from "react";
import Link from "next/link";
import { ProfileDestinationEditModal } from "@/components/profile/ProfileDestinationEditModal";
import type { VisitedCountry, VisitedPark } from "@/types/database";

type ParkPagePinEditProps = {
  ownerPark: VisitedPark;
  visitedCountries: VisitedCountry[];
  label: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ParkPagePinEdit({
  ownerPark,
  visitedCountries,
  label,
  open: controlledOpen,
  onOpenChange,
}: ParkPagePinEditProps) {
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
          city={null}
          park={ownerPark}
          visitedCountries={visitedCountries}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

export function ParkPagePinEditModal({
  ownerPark,
  visitedCountries,
  open,
  onClose,
}: {
  ownerPark: VisitedPark;
  visitedCountries: VisitedCountry[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <ProfileDestinationEditModal
      city={null}
      park={ownerPark}
      visitedCountries={visitedCountries}
      onClose={onClose}
    />
  );
}

export function ParkPagePinEditTrigger({
  label,
  onClick,
  className = "city-page__pin-stat-cta",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  );
}

export function ParkPagePinEditLink({
  href,
  label,
  className = "city-page__pin-stat-cta",
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
