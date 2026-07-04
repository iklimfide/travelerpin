import Link from "next/link";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { HubSectionHeading } from "@/components/hub/HubSectionHeading";
import type { CountryTraveler } from "@/lib/supabase/country-travelers";
import type { ReactNode } from "react";

type HubRecentTravelersProps = {
  travelers: CountryTraveler[];
  headingId: string;
  layout?: "list" | "row";
  headingCta?: ReactNode;
  labels: {
    recentTravelers: string;
    noTravelersYet: string;
    pinCta: string;
  };
  registerHref?: string;
};

export function HubRecentTravelers({
  travelers,
  headingId,
  layout = "list",
  headingCta,
  labels,
  registerHref = "/register",
}: HubRecentTravelersProps) {
  const travelersClassName =
    layout === "row" ? "city-page__travelers city-page__travelers--row" : "city-page__travelers";

  return (
    <section className="city-page__section" aria-labelledby={headingId}>
      <HubSectionHeading id={headingId} title={labels.recentTravelers} cta={headingCta} />
      {travelers.length > 0 ? (
        <ul className={travelersClassName}>
          {travelers.map((traveler) => (
            <li key={traveler.username}>
              <Link href={traveler.profilePath} className="city-page__traveler-link">
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
      )}
    </section>
  );
}
