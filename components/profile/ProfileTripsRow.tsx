"use client";

import Link from "next/link";
import { ProfileTripCard } from "@/components/profile/ProfileTripCard";
import { useClampTripsToPrimaryColumn } from "@/lib/hooks/useClampTripsToPrimaryColumn";
import type { ProfileTrip } from "@/lib/utils/profile-page";

type ProfileTripsRowProps = {
  trips: ProfileTrip[];
  title: string;
  allLabel: string;
  allHref?: string;
  badgeLabels: Record<NonNullable<ProfileTrip["badge"]>, string>;
  clampToPrimaryColumn?: boolean;
};

export function ProfileTripsRow({
  trips,
  title,
  allLabel,
  allHref,
  badgeLabels,
  clampToPrimaryColumn = false,
}: ProfileTripsRowProps) {
  const scrollRef = useClampTripsToPrimaryColumn(clampToPrimaryColumn);

  if (trips.length === 0 && !allHref) return null;

  return (
    <section className="profile-section profile-trips-section">
      <div className="profile-section-head">
        <h2 className="profile-section-title">{title}</h2>
        {allHref ? (
          <Link href={allHref} className="profile-see-all">
            {allLabel}
          </Link>
        ) : (
          <span className="profile-see-all">{allLabel}</span>
        )}
      </div>

      {trips.length > 0 ? (
        <div
          ref={clampToPrimaryColumn ? scrollRef : undefined}
          className={`profile-trips-scroll scrollbar-thin${clampToPrimaryColumn ? " profile-trips-scroll--clamped" : ""}`}
        >
          <div className="profile-trips-track" role="list" aria-label={title}>
            {trips.map((trip) => (
              <ProfileTripCard key={trip.id} trip={trip} badgeLabels={badgeLabels} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
