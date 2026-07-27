"use client";

import type { ReactNode } from "react";
import { ProfileCountryLink, ProfileParkLink } from "@/components/profile/ProfilePlaceLink";
import {
  profileParkHeroLookupName,
  useProfileParkHeroImage,
} from "@/components/profile/profile-place-hero-image";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { parkTypeLabel } from "@/lib/utils/park-type";
import type { ProfileParkDestination } from "@/lib/utils/profile-all-destinations";

type ProfileParkDestinationCardProps = {
  park: ProfileParkDestination;
  layout?: "row" | "grid";
  actions?: ReactNode;
};

export function ProfileParkDestinationCard({
  park,
  layout = "grid",
  actions,
}: ProfileParkDestinationCardProps) {
  const photoUrl = useProfileParkHeroImage(
    park.countryCode,
    profileParkHeroLookupName(park.parkSlug, park.parkName),
    park.parkType,
    park.imageUrl
  );

  return (
    <article className={`profile-trip${layout === "grid" ? " profile-trip--grid" : ""}`}>
      <div className="profile-trip-image profile-trip-image--park">
        {/* Plain img — /api/hub-photo proxy URLs break under next/image on production. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt=""
          className="profile-trip-image__photo object-cover"
        />
        <span className="profile-trip-badge">{parkTypeLabel(park.parkType)}</span>
      </div>
      <div className="profile-trip-body">
        <h3>
          <ProfileParkLink
            slug={park.parkSlug}
            name={park.parkName}
            className="profile-trip-title-link"
          />
        </h3>
        {park.note?.trim() ? <p>{park.note.trim()}</p> : null}
        <div className="profile-trip-meta">
          <span className="profile-chip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={countryCodeToFlagUrl(park.countryCode)}
              alt=""
              width={16}
              height={16}
              className="profile-chip-flag mr-1 inline-block"
            />
            <ProfileCountryLink
              slug={park.countrySlug}
              name={park.countryName}
              className="profile-chip-link"
            />
          </span>
        </div>
        {actions}
      </div>
    </article>
  );
}
