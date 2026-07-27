"use client";

import type { ReactNode } from "react";
import { ProfileCityLink, ProfileCountryLink, ProfileParkLink } from "@/components/profile/ProfilePlaceLink";
import {
  profileCityHeroLookupName,
  useProfileCityHeroImage,
} from "@/components/profile/profile-place-hero-image";
import { profileCardGradient } from "@/components/profile/profile-card-gradient";
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
  const cityHeroUrl = useProfileCityHeroImage(
    trip.countryCode,
    profileCityHeroLookupName(trip.citySlug, trip.placeName),
    trip.kind === "city" ? trip.imageUrl : null
  );
  const photoUrl = trip.kind === "city" ? cityHeroUrl : trip.imageUrl;

  return (
    <article
      className={`profile-trip${layout === "grid" ? " profile-trip--grid" : ""}`}
    >
      <div
        className={`profile-trip-image${
          trip.kind === "country"
            ? " profile-trip-image--country"
            : trip.kind === "park"
              ? " profile-trip-image--park"
              : ""
        }`}
        style={
          trip.kind === "country" && !trip.imageUrl
            ? { background: profileCardGradient(trip.countryCode) }
            : undefined
        }
      >
        {photoUrl ? (
          // Plain img — proxy URLs use /api/hub-photo?key=… which next/image rejects on production.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            className="profile-trip-image__photo object-cover"
          />
        ) : trip.kind === "country" ? (
          <div className="profile-trip-flag">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={countryCodeToFlagUrl(trip.countryCode)}
              alt=""
              width={72}
              height={72}
            />
          </div>
        ) : null}
        {trip.badge ? (
          <span className="profile-trip-badge">{badgeLabels[trip.badge]}</span>
        ) : trip.kind === "park" && trip.parkType ? (
          <span className="profile-trip-badge">{parkTypeLabel(trip.parkType)}</span>
        ) : null}
      </div>
      <div className="profile-trip-body">
        <h3>
          {trip.kind === "country" ? (
            <ProfileCountryLink
              slug={trip.countrySlug}
              name={trip.placeName}
              className="profile-trip-title-link"
              title={trip.placeName}
            />
          ) : trip.kind === "city" ? (
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
        {trip.kind !== "country" ? (
          <div className="profile-trip-meta">
            <span className="profile-chip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
              src={countryCodeToFlagUrl(trip.countryCode)}
              alt=""
              width={16}
              height={16}
              className="profile-chip-flag mr-1 inline-block"
            />
              <ProfileCountryLink
                slug={trip.countrySlug}
                name={trip.countryName}
                className="profile-chip-link"
                title={trip.countryName}
              />
            </span>
          </div>
        ) : null}
        {actions}
      </div>
    </article>
  );
}
