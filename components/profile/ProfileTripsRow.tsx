import Link from "next/link";
import { ProfileTripCard } from "@/components/profile/ProfileTripCard";
import type { ProfileTrip } from "@/lib/utils/profile-page";

type ProfileTripsRowProps = {
  trips: ProfileTrip[];
  title: string;
  allLabel: string;
  allHref?: string;
  badgeLabels: Record<NonNullable<ProfileTrip["badge"]>, string>;
};

export function ProfileTripsRow({
  trips,
  title,
  allLabel,
  allHref,
  badgeLabels,
}: ProfileTripsRowProps) {
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
        <div className="profile-trips-scroll scrollbar-thin">
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
