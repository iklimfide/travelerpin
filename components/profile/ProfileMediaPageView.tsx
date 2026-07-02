"use client";

import Link from "next/link";
import { ProfileMediaGallery } from "@/components/profile/ProfileMediaGallery";
import { formatMessage } from "@/lib/i18n/client-messages";
import type { HubGalleryItem } from "@/lib/supabase/hub-traveler-pin";
import { profileMediaPath, profilePath } from "@/lib/seo/site";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

type ProfileMediaTab = "photos" | "instagram";

type ProfileMediaPageViewProps = {
  username: string;
  displayName: string;
  isOwnProfile: boolean;
  tab: ProfileMediaTab;
  page: number;
  totalPages: number;
  photoCount: number;
  instagramCount: number;
  items: HubGalleryItem[];
  visitedCountries: VisitedCountry[];
  visitedCities: VisitedCity[];
  visitedParks: VisitedPark[];
  labels: {
    photosHeading: string;
    instagramHeading: string;
    noInstagramYet: string;
    viewPin: string;
    viewMap: string;
    close: string;
    instagramPost: string;
    viewAll: string;
    editMedia: string;
    removeMedia: string;
    removePhotoTitle: string;
    removePhotoMessage: string;
    removeInstagramTitle: string;
    removeInstagramMessage: string;
    mediaPageTitleOwn: string;
    mediaPageTitleVisitor: string;
    mediaPageTabPhotos: string;
    mediaPageTabInstagram: string;
    mediaPageBack: string;
    mediaPageEmpty: string;
    mediaPagePrev: string;
    mediaPageNext: string;
    mediaPageStatus: string;
  };
};

function MediaPagination({
  username,
  tab,
  page,
  totalPages,
  prevLabel,
  nextLabel,
  statusLabel,
}: {
  username: string;
  tab: ProfileMediaTab;
  page: number;
  totalPages: number;
  prevLabel: string;
  nextLabel: string;
  statusLabel: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="profile-media-page__pagination" aria-label="Media pages">
      {page > 1 ? (
        <Link href={profileMediaPath(username, tab, page - 1)} className="profile-media-page__page-link">
          {prevLabel}
        </Link>
      ) : (
        <span className="profile-media-page__page-link profile-media-page__page-link--disabled">
          {prevLabel}
        </span>
      )}

      <span className="profile-media-page__page-status">
        {formatMessage(statusLabel, { page, total: totalPages })}
      </span>

      {page < totalPages ? (
        <Link href={profileMediaPath(username, tab, page + 1)} className="profile-media-page__page-link">
          {nextLabel}
        </Link>
      ) : (
        <span className="profile-media-page__page-link profile-media-page__page-link--disabled">
          {nextLabel}
        </span>
      )}
    </nav>
  );
}

export function ProfileMediaPageView({
  username,
  displayName,
  isOwnProfile,
  tab,
  page,
  totalPages,
  photoCount,
  instagramCount,
  items,
  visitedCountries,
  visitedCities,
  visitedParks,
  labels,
}: ProfileMediaPageViewProps) {
  const title = isOwnProfile
    ? labels.mediaPageTitleOwn
    : formatMessage(labels.mediaPageTitleVisitor, { name: displayName });

  const tabs: { id: ProfileMediaTab; label: string; count: number }[] = [
    { id: "photos", label: labels.mediaPageTabPhotos, count: photoCount },
    { id: "instagram", label: labels.mediaPageTabInstagram, count: instagramCount },
  ];

  return (
    <div className="profile-page profile-media-page">
      <div className="profile-shell">
        <div className="profile-all-header">
          <Link href={profilePath(username)} className="profile-all-back">
            ← {labels.mediaPageBack}
          </Link>
          <h1 className="profile-all-title">{title}</h1>
        </div>

        <div className="profile-media-page__tabs" role="tablist" aria-label="Media categories">
          {tabs.map((item) => (
            <Link
              key={item.id}
              href={profileMediaPath(username, item.id)}
              role="tab"
              aria-selected={tab === item.id}
              className={`profile-media-page__tab${tab === item.id ? " profile-media-page__tab--active" : ""}`}
            >
              <span>{item.label}</span>
              <span className="profile-media-page__tab-count">{item.count}</span>
            </Link>
          ))}
        </div>

        <div className="profile-media-sections profile-media-sections--page">
          {items.length > 0 ? (
            <ProfileMediaGallery
              hubName={displayName}
              variant={tab}
              headingId={`profile-media-page-${tab}`}
              items={items}
              hideHeading
              isOwnProfile={isOwnProfile}
              visitedCountries={visitedCountries}
              visitedCities={visitedCities}
              visitedParks={visitedParks}
              labels={labels}
            />
          ) : (
            <p className="profile-empty">{labels.mediaPageEmpty}</p>
          )}
        </div>

        <MediaPagination
          username={username}
          tab={tab}
          page={page}
          totalPages={totalPages}
          prevLabel={labels.mediaPagePrev}
          nextLabel={labels.mediaPageNext}
          statusLabel={labels.mediaPageStatus}
        />
      </div>
    </div>
  );
}
