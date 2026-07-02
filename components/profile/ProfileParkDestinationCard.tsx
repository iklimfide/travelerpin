import Image from "next/image";
import type { ReactNode } from "react";
import { ProfileCountryLink, ProfileParkLink } from "@/components/profile/ProfilePlaceLink";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { parkTypeLabel } from "@/lib/utils/park-type";
import type { ProfileParkDestination } from "@/lib/utils/profile-all-destinations";

type ProfileParkDestinationCardProps = {
  park: ProfileParkDestination;
  emptyNote: string;
  layout?: "row" | "grid";
  actions?: ReactNode;
};

export function ProfileParkDestinationCard({
  park,
  emptyNote,
  layout = "grid",
  actions,
}: ProfileParkDestinationCardProps) {
  return (
    <article className={`profile-trip${layout === "grid" ? " profile-trip--grid" : ""}`}>
      <div className="profile-trip-image">
        <Image src={park.imageUrl} alt="" fill sizes="245px" className="object-cover" />
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
        <p>{park.note?.trim() || emptyNote}</p>
        <div className="profile-trip-meta">
          <span className="profile-chip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={countryCodeToFlagUrl(park.countryCode)}
              alt=""
              width={16}
              height={12}
              className="mr-1 inline-block rounded-sm"
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
