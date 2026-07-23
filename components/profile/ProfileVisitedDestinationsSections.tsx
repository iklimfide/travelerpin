"use client";

import type { ReactNode } from "react";
import { formatMessage, useAppMessages } from "@/lib/i18n/client-messages";

/** Preview grid: 2 columns × 3 rows. */
export const PREVIEW_LIMIT = 6;

export type ProfileVisitedTab = "countries" | "cities" | "parks" | "wishlist";

export const PROFILE_VISITED_TABS: { id: ProfileVisitedTab; icon: string }[] = [
  { id: "countries", icon: "🌍" },
  { id: "cities", icon: "📍" },
  { id: "parks", icon: "🏞️" },
  { id: "wishlist", icon: "⭐" },
];

export function sectionId(tab: ProfileVisitedTab): string {
  return `profile-all-${tab}`;
}

export function DestinationSection({
  id,
  title,
  count,
  onOpenAll,
  children,
}: {
  id: string;
  title: string;
  count: number;
  onOpenAll?: () => void;
  children: ReactNode;
}) {
  const { profile: profileMessages } = useAppMessages();
  const showAllButton = count > 0;

  return (
    <section id={id} className="profile-all-section profile-all-box">
      <div className="profile-all-box__head">
        <div className="profile-all-box__title-row">
          <h2 className="profile-all-box__title">{title}</h2>
          <span className="profile-all-section__count">{count}</span>
        </div>
        {showAllButton ? (
          <button type="button" className="profile-all-box__all" onClick={onOpenAll}>
            {profileMessages.allDestinationsAll}
          </button>
        ) : null}
      </div>
      {count === 0 ? (
        <p className="profile-all-box__empty">{profileMessages.allDestinationsTabEmpty}</p>
      ) : (
        <div className="profile-all-grid profile-all-grid--preview" role="list" aria-label={title}>
          {children}
        </div>
      )}
    </section>
  );
}

export function ProfileVisitedDestinationsNav({
  displayName,
  isOwnProfile,
  activeTab,
  onTabChange,
}: {
  displayName: string;
  isOwnProfile: boolean;
  activeTab: ProfileVisitedTab;
  onTabChange: (tab: ProfileVisitedTab) => void;
}) {
  const { profile: profileMessages, saveDestination: saveDestinationMessages } = useAppMessages();
  const visitedLabel = isOwnProfile
    ? profileMessages.allDestinationsVisitedPrefixOwn
    : formatMessage(profileMessages.allDestinationsVisitedPrefixVisitor, { name: displayName });

  const tabLabels: Record<ProfileVisitedTab, string> = {
    countries: saveDestinationMessages.tabCountries,
    cities: saveDestinationMessages.tabCities,
    parks: saveDestinationMessages.tabParks,
    wishlist: saveDestinationMessages.tabWishlist,
  };

  return (
    <div className="profile-all-nav">
      <h2 className="profile-all-nav__title">{visitedLabel}</h2>
      <div className="profile-all-tabs" role="tablist" aria-label="Destination categories">
        {PROFILE_VISITED_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeTab === item.id}
            className={`profile-all-tabs__tab${activeTab === item.id ? " profile-all-tabs__tab--active" : ""}`}
            onClick={() => onTabChange(item.id)}
          >
            <span aria-hidden>{item.icon}</span>
            {tabLabels[item.id]}
          </button>
        ))}
      </div>
    </div>
  );
}
