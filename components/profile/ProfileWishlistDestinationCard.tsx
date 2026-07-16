import type { ReactNode } from "react";
import { ProfileCountryLink } from "@/components/profile/ProfilePlaceLink";
import { profileCardGradient } from "@/components/profile/profile-card-gradient";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import type { ProfileWishlistDestination } from "@/lib/utils/profile-all-destinations";

type ProfileWishlistDestinationCardProps = {
  country: ProfileWishlistDestination;
  wantLabel: string;
  layout?: "row" | "grid";
  actions?: ReactNode;
};

export function ProfileWishlistDestinationCard({
  country,
  wantLabel,
  layout = "grid",
  actions,
}: ProfileWishlistDestinationCardProps) {
  return (
    <article className={`profile-trip${layout === "grid" ? " profile-trip--grid" : ""}`}>
      <div
        className="profile-trip-image profile-trip-image--country"
        style={{ background: profileCardGradient(country.countryCode) }}
      >
        <div className="profile-trip-flag">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={countryCodeToFlagUrl(country.countryCode)}
            alt=""
            width={72}
            height={72}
          />
        </div>
        <span className="profile-trip-badge profile-trip-badge--wishlist">{wantLabel}</span>
      </div>
      <div className="profile-trip-body">
        <h3>
          <ProfileCountryLink
            slug={country.countrySlug}
            name={country.countryName}
            className="profile-trip-title-link"
          />
        </h3>
        {actions}
      </div>
    </article>
  );
}
