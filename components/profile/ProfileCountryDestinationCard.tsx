import type { ReactNode } from "react";
import { ProfileCountryLink } from "@/components/profile/ProfilePlaceLink";
import { profileCardGradient } from "@/components/profile/profile-card-gradient";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import type { ProfileCountryDestination } from "@/lib/utils/profile-all-destinations";

type ProfileCountryDestinationCardProps = {
  country: ProfileCountryDestination;
  cityCountLabel: (count: number) => string;
  parkCountLabel: (count: number) => string;
  layout?: "row" | "grid";
  actions?: ReactNode;
};

export function ProfileCountryDestinationCard({
  country,
  cityCountLabel,
  parkCountLabel,
  layout = "grid",
  actions,
}: ProfileCountryDestinationCardProps) {
  const metaParts: string[] = [];
  if (country.cityCount > 0) metaParts.push(cityCountLabel(country.cityCount));
  if (country.parkCount > 0) metaParts.push(parkCountLabel(country.parkCount));

  return (
    <article className={`profile-trip${layout === "grid" ? " profile-trip--grid" : ""}`}>
      <div
        className="profile-trip-image profile-trip-image--country"
        style={{ background: profileCardGradient(country.code) }}
      >
        <div className="profile-trip-flag">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={countryCodeToFlagUrl(country.code)}
            alt=""
            width={80}
            height={80}
            className="rounded-full object-cover shadow-md"
          />
        </div>
      </div>
      <div className="profile-trip-body">
        <h3>
          <ProfileCountryLink
            slug={country.countrySlug}
            name={country.name}
            className="profile-trip-title-link"
          />
        </h3>
        {metaParts.length > 0 ? <p>{metaParts.join(" · ")}</p> : null}
        {actions}
      </div>
    </article>
  );
}
