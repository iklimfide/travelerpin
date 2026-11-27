import { Link } from "@/lib/i18n/navigation";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { HubSectionHeading } from "@/components/hub/HubSectionHeading";
import type { CountryTraveler } from "@/lib/supabase/country-travelers";
import type { ReactNode } from "react";

type HubRecentTravelersProps = {
  travelers: CountryTraveler[];
  headingId: string;
  layout?: "list" | "row";
  headingCta?: ReactNode;
  hideHeading?: boolean;
  showViewAll?: boolean;
  viewAllLabel?: string;
  onViewAll?: () => void;
  labels: {
    recentTravelers: string;
    noTravelersYet: string;
    pinCta: string;
  };
  registerHref?: string;
};

function TravelerList({
  travelers,
  layout,
}: {
  travelers: CountryTraveler[];
  layout: "list" | "row";
}) {
  const travelersClassName =
    layout === "row" ? "city-page__travelers city-page__travelers--row" : "city-page__travelers";

  return (
    <ul className={travelersClassName}>
      {travelers.map((traveler) => (
        <li key={traveler.username}>
          <Link href={traveler.profilePath} className="city-page__traveler-link" prefetch={false}>
            <ProfileAvatar
              avatarUrl={traveler.avatarUrl}
              displayName={traveler.displayName}
              username={traveler.username}
              size="sm"
            />
            <div className="min-w-0">
              <p className="city-page__traveler-name">{traveler.displayName}</p>
              <p className="city-page__traveler-handle">@{traveler.username}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function HubRecentTravelers({
  travelers,
  headingId,
  layout = "list",
  headingCta,
  hideHeading = false,
  showViewAll = false,
  viewAllLabel,
  onViewAll,
  labels,
  registerHref = "/register",
}: HubRecentTravelersProps) {
  const canShowViewAll = Boolean(showViewAll && onViewAll && viewAllLabel);

  const list =
    travelers.length > 0 ? (
      <TravelerList travelers={travelers} layout={layout} />
    ) : (
      <p className="city-page__empty">
        {labels.noTravelersYet}
        {labels.pinCta ? (
          <>
            {" "}
            <Link href={registerHref} className="city-page__link">
              {labels.pinCta}
            </Link>
          </>
        ) : null}
      </p>
    );

  if (hideHeading) {
    return list;
  }

  const heading = (
    <HubSectionHeading id={headingId} title={labels.recentTravelers} cta={headingCta} />
  );

  return (
    <section className="city-page__section" aria-labelledby={headingId}>
      {canShowViewAll ? (
        <div className="city-page__hub-media-head city-page__hub-media-head--has-view-all">
          {heading}
          <button type="button" className="city-page__section-view-all" onClick={onViewAll}>
            {viewAllLabel}
          </button>
        </div>
      ) : (
        heading
      )}
      {list}
    </section>
  );
}
