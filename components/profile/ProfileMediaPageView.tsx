"use client";

import { Link } from "@/lib/i18n/navigation";
import { useState } from "react";
import { ProfileMediaGallery } from "@/components/profile/ProfileMediaGallery";
import { formatMessage } from "@/lib/i18n/client-messages";
import type { HubGalleryItem } from "@/lib/supabase/hub-traveler-pin";
import { profilePath } from "@/lib/seo/site";
import { PROFILE_MEDIA_PREVIEW_LIMIT } from "@/lib/utils/profile-media";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

type ProfileMediaTab = "photos" | "instagram";

type ProfileMediaPageViewProps = {
  username: string;
  displayName: string;
  isOwnProfile: boolean;
  tab: ProfileMediaTab;
  photoCount: number;
  instagramCount: number;
  allPhotoItems: HubGalleryItem[];
  allInstagramItems: HubGalleryItem[];
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
    viewLess: string;
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
  };
};

export function ProfileMediaPageView({
  username,
  displayName,
  isOwnProfile,
  tab,
  photoCount,
  instagramCount,
  allPhotoItems,
  allInstagramItems,
  visitedCountries,
  visitedCities,
  visitedParks,
  labels,
}: ProfileMediaPageViewProps) {
  const [expandedPhotos, setExpandedPhotos] = useState(false);
  const [expandedInstagram, setExpandedInstagram] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileMediaTab>(tab);

  const title = isOwnProfile
    ? labels.mediaPageTitleOwn
    : formatMessage(labels.mediaPageTitleVisitor, { name: displayName });

  const tabs: { id: ProfileMediaTab; label: string; count: number }[] = [
    { id: "photos", label: labels.mediaPageTabPhotos, count: photoCount },
    { id: "instagram", label: labels.mediaPageTabInstagram, count: instagramCount },
  ];

  function handleTabChange(next: ProfileMediaTab) {
    setActiveTab(next);
    document
      .getElementById(next === "photos" ? "profile-media-photos-panel" : "profile-media-instagram-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const photoItems = expandedPhotos
    ? allPhotoItems
    : allPhotoItems.slice(0, PROFILE_MEDIA_PREVIEW_LIMIT);
  const instagramItems = expandedInstagram
    ? allInstagramItems
    : allInstagramItems.slice(0, PROFILE_MEDIA_PREVIEW_LIMIT);

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
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeTab === item.id}
              className={`profile-media-page__tab${activeTab === item.id ? " profile-media-page__tab--active" : ""}`}
              onClick={() => handleTabChange(item.id)}
            >
              <span>{item.label}</span>
              <span className="profile-media-page__tab-count">{item.count}</span>
            </button>
          ))}
        </div>

        <div className="profile-media-page__panels profile-media-sections">
          <div id="profile-media-photos-panel" className="profile-media-page__panel-anchor">
            {allPhotoItems.length > 0 ? (
              <ProfileMediaGallery
                hubName={displayName}
                variant="photos"
                headingId="profile-media-page-photos-heading"
                items={photoItems}
                onViewAll={() => setExpandedPhotos((value) => !value)}
                viewAllExpanded={expandedPhotos}
                showViewAll
                isOwnProfile={isOwnProfile}
                visitedCountries={visitedCountries}
                visitedCities={visitedCities}
                visitedParks={visitedParks}
                labels={labels}
              />
            ) : (
              <section className="city-page__section profile-media-gallery-section">
                <div className="city-page__hub-photo-gallery profile-media-box">
                  <div className="profile-media-box__head">
                    <h2
                      id="profile-media-page-photos-heading"
                      className="profile-media-box__title"
                    >
                      {labels.photosHeading}
                    </h2>
                  </div>
                  <p className="city-page__empty">{labels.mediaPageEmpty}</p>
                </div>
              </section>
            )}
          </div>

          <div id="profile-media-instagram-panel" className="profile-media-page__panel-anchor">
            <ProfileMediaGallery
              hubName={displayName}
              variant="instagram"
              headingId="profile-media-page-instagram-heading"
              items={instagramItems}
              alwaysShow
              emptyLabel={labels.noInstagramYet}
              onViewAll={() => setExpandedInstagram((value) => !value)}
              viewAllExpanded={expandedInstagram}
              showViewAll
              isOwnProfile={isOwnProfile}
              visitedCountries={visitedCountries}
              visitedCities={visitedCities}
              visitedParks={visitedParks}
              labels={labels}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
