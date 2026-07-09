import Image from "next/image";
import type { ReactNode } from "react";
import { ProfileCityLink, ProfileCountryLink, ProfileParkLink } from "@/components/profile/ProfilePlaceLink";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { parkTypeLabel } from "@/lib/utils/park-type";
import type { ProfileTrip } from "@/lib/utils/profile-page";

type ProfileTripCardProps = {
  trip: ProfileTrip;
  badgeLabels: Record<NonNullable<ProfileTrip["badge"]>, string>;
  layout?: "row" | "grid";
  actions?: ReactNode;
};

export function ProfileTripCard({
  trip,
  badgeLabels,
  layout = "row",
  actions,
}: ProfileTripCardProps) {
  return (
    <article
      className={`profile-trip${layout === "grid" ? " profile-trip--grid" : ""}`}
    >
      <div className="profile-trip-image">
        <Image
          src={trip.imageUrl}
          alt=""
          fill
          sizes="200px"
          className="profile-trip-image__photo object-cover"
        />
        {trip.badge ? (
          <span className="profile-trip-badge">{badgeLabels[trip.badge]}</span>
        ) : trip.kind === "park" && trip.parkType ? (
          <span className="profile-trip-badge">{parkTypeLabel(trip.parkType)}</span>
        ) : null}
      </div>
      <div className="profile-trip-body">
        <h3>
          {trip.kind === "city" ? (
            <ProfileCityLink
              slug={trip.citySlug}
              name={trip.placeName}
              className="profile-trip-title-link"
              title={trip.placeName}
            />
          ) : (
            <ProfileParkLink
              slug={trip.parkSlug}
              name={trip.placeName}
              className="profile-trip-title-link"
              title={trip.placeName}
            />
          )}
        </h3>
        {trip.note?.trim() ? <p>{trip.note.trim()}</p> : null}
        <div className="profile-trip-meta">
          <span className="profile-chip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={countryCodeToFlagUrl(trip.countryCode)}
              alt=""
              width={16}
              height={12}
              className="mr-1 inline-block rounded-sm"
            />
            <ProfileCountryLink
              slug={trip.countrySlug}
              name={trip.countryName}
              className="profile-chip-link"
              title={trip.countryName}
            />
          </span>
        </div>
        {actions}
      </div>
    </article>
  );
}
