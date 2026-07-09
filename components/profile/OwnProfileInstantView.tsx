"use client";

import Link from "next/link";
import { ProfileOwnerTools } from "@/components/dashboard/ProfileOwnerTools";
import { TravelMapFocusShell } from "@/components/map/TravelMapFocusShell";
import { ProfileActionButtons } from "@/components/profile/ProfileActionButtons";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileHeroCover } from "@/components/profile/ProfileHeroCover";
import { ProfileInstagramLink } from "@/components/profile/ProfileInstagramLink";
import { ProfileMapPanel } from "@/components/profile/ProfileMapPanel";
import { ProfileMediaSections } from "@/components/profile/ProfileMediaSections";
import { ProfileStatCounters } from "@/components/profile/ProfileStatCounters";
import { ProfileSummaryGrid } from "@/components/profile/ProfileSummaryGrid";
import { ProfileTravelUpdateCard } from "@/components/profile/ProfileTravelUpdateCard";
import { ProfileTripsRow } from "@/components/profile/ProfileTripsRow";
import { useOwnProfileData } from "@/components/profile/OwnProfileDataProvider";
import {
  commonMessages,
  formatMessage,
  profileMessages,
  settingsMessages,
} from "@/lib/i18n/client-messages";
import { profileAllPath } from "@/lib/seo/site";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { buildProfileMediaPins } from "@/lib/utils/profile-media";
import {
  buildProfileSummary,
  buildProfileTrips,
  WORLD_COUNTRY_TOTAL,
  worldCoveragePercent,
} from "@/lib/utils/profile-page";
import { resolveResidenceCityHref } from "@/lib/utils/residence-city";
import {
  BADGE_TIER_THEMES,
  getTravelerBadgeLabel,
  getTravelerBadgeTier,
} from "@/lib/utils/traveler-badge";
import { computeTravelUpdateDelta } from "@/lib/utils/travel-update";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";

function InstantWorldProgress({ countryCount }: { countryCount: number }) {
  const coverage = worldCoveragePercent(countryCount);
  return (
    <div className="profile-world-progress">
      <div className="profile-world-progress__top">
        <strong>
          <span aria-hidden>🌍</span> {profileMessages.worldExplored}
        </strong>
        <span className="profile-world-progress__percent">{coverage}%</span>
      </div>
      <div className="profile-world-progress__bar" aria-hidden>
        <div className="profile-world-progress__fill" style={{ width: `${coverage}%` }} />
      </div>
      <p className="profile-world-progress__caption">
        {formatMessage(profileMessages.worldExploredCaption, {
          pinned: countryCount,
          total: WORLD_COUNTRY_TOTAL,
        })}
      </p>
    </div>
  );
}

function InstantTravelerBadge({ countryCount }: { countryCount: number }) {
  const tier = getTravelerBadgeTier(countryCount);
  const label = getTravelerBadgeLabel(countryCount);
  if (!tier || !label) return null;
  const theme = BADGE_TIER_THEMES[tier];
  return (
    <span
      className={`inline-flex w-fit max-w-full items-center gap-0.5 rounded-full border px-1.5 py-px text-[9px] font-medium leading-tight tracking-normal text-inherit sm:text-[10px] ${theme.shell} traveler-badge--profile-card`}
    >
      {label}
    </span>
  );
}

function InstantIdentityCard({
  data,
  displayName,
}: {
  data: PublicProfilePageData;
  displayName: string;
}) {
  const { profile, stats, followState, canFollow, isLoggedIn } = data;
  const allHref = profileAllPath(profile.username);

  return (
    <section className="profile-card">
      <ProfileActionButtons
        username={profile.username}
        displayName={displayName}
        stats={stats}
        isOwnProfile
        shareLabel={profileMessages.shareProfile}
        isLoggedIn={isLoggedIn}
        canFollow={canFollow}
        followState={followState}
      />

      <div className="profile-avatar-shell">
        <ProfileAvatar
          avatarUrl={profile.avatar_url}
          displayName={displayName}
          username={profile.username}
          size="lg"
          className="profile-avatar !h-28 !w-28 !rounded-[32px] !text-[38px] !ring-8 !ring-[#eef3f9]"
        />
      </div>

      <h2 className="profile-name">{displayName}</h2>

      <div className="mt-2 flex justify-center">
        <InstantTravelerBadge countryCount={stats.countries} />
      </div>

      {profile.instagram_url ? (
        <ProfileInstagramLink url={profile.instagram_url} />
      ) : (
        <span className="profile-instagram-spacer" aria-hidden="true" />
      )}

      {profile.bio?.trim() ? <p className="profile-desc">{profile.bio.trim()}</p> : null}

      <Link
        href={allHref}
        className="profile-metrics profile-metrics-link"
        aria-label={formatMessage(profileMessages.allDestinationsTitle, { name: displayName })}
      >
        <InstantWorldProgress countryCount={stats.countries} />
        <ProfileStatCounters
          countries={stats.countries}
          cities={stats.cities}
          nationalParks={stats.nationalParks}
          themeParks={stats.themeParks}
          countriesLabel={profileMessages.statCountriesShort}
          citiesLabel={profileMessages.statCitiesShort}
          nationalParksLabel={profileMessages.statNationalParksShort}
          themeParksLabel={profileMessages.statThemeParksShort}
        />
      </Link>
    </section>
  );
}

/**
 * Paints the signed-in user's own profile from client cache while the RSC
 * route segment is still loading — avoids a blank/skeleton flash.
 */
export function OwnProfileInstantView() {
  const ctx = useOwnProfileData();
  const data = ctx?.data;
  if (!data) return null;

  const {
    profile,
    visitedCountries,
    visitedCities,
    visitedParks,
    wishlistCountries,
    stats,
    visitedCodes,
    wishlistCodes,
    isLoggedIn,
  } = data;

  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
  // Own profile: always show wishlist (matches PublicProfileView isOwnProfile branch).
  const visibleWishlistCountries = wishlistCountries;
  const visibleWishlistCodes = wishlistCodes;
  const hasMapContent =
    visitedCountries.length > 0 ||
    visitedCities.length > 0 ||
    visitedParks.length > 0 ||
    visibleWishlistCodes.length > 0;

  const trips = buildProfileTrips(visitedCities, visitedParks, profile.residence);
  const mediaPins = buildProfileMediaPins(visitedCities, visitedParks, profile);
  const summary = buildProfileSummary(
    visitedCountries,
    visitedCities,
    visitedParks,
    visibleWishlistCountries
  );
  const residenceHref = resolveResidenceCityHref(profile.residence);
  const travelDelta = computeTravelUpdateDelta(
    null,
    stats,
    visitedCodes,
    visitedCountries,
    visitedCities,
    visitedParks
  );

  return (
    <TravelMapFocusShell>
      <div className="profile-page" aria-busy="true">
        <div className="profile-shell">
          <div
            id={`profile-story-capture-${profile.username.toLowerCase()}`}
            className="profile-story-capture"
          >
            <ProfileHeroCover
              residence={profile.residence}
              residenceHref={residenceHref}
              heroTitle={formatMessage(profileMessages.travelDiaryTitle, { name: displayName })}
              heroSubtitle={profileMessages.travelDiarySubtitle}
            />

            <div className="profile-main">
              <InstantIdentityCard data={data} displayName={displayName} />

              {hasMapContent ? (
                <div
                  id={`profile-square-capture-${profile.username.toLowerCase()}`}
                  className="profile-square-capture"
                >
                  <ProfileMapPanel
                    visitedCountryCodes={visitedCodes}
                    wishlistCountryCodes={visibleWishlistCodes}
                    visitedCountries={visitedCountries}
                    wishlistCountries={visibleWishlistCountries}
                    visitedCities={visitedCities}
                    visitedParks={visitedParks}
                    isLoggedIn={isLoggedIn}
                    canEditMap
                    countryCount={stats.countries}
                    exploredBadgeLabel={profileMessages.mapExploredBadge}
                    allHref={profileAllPath(profile.username)}
                    allAriaLabel={profileMessages.mapViewAll}
                  />
                </div>
              ) : (
                <section className="profile-section">
                  <p className="profile-empty">{profileMessages.noCountries}</p>
                </section>
              )}
            </div>
          </div>

          <main className="profile-main">
            <ProfileTravelUpdateCard
              username={profile.username}
              displayName={displayName}
              stats={stats}
              delta={travelDelta}
              isOwnProfile
              persistShareSnapshot={false}
            />

            <ProfileTripsRow
              trips={trips}
              title={profileMessages.myTrips}
              allLabel={profileMessages.tripsAll}
              allHref={hasMapContent ? profileAllPath(profile.username) : undefined}
              badgeLabels={{
                recent: profileMessages.tripBadgeRecent,
                favorite: profileMessages.tripBadgeFavorite,
                dayTrip: profileMessages.tripBadgeDayTrip,
              }}
              visitCountLabel={(count) =>
                count === 1 ? `${count} visit` : `${count} visits`
              }
              emptyNote={profileMessages.tripDefaultNote}
            />

            <div className="profile-dashboard-tools">
              <ProfileOwnerTools
                visitedCountries={visitedCountries}
                visitedCities={visitedCities}
                visitedParks={visitedParks}
                wishlistCountries={wishlistCountries}
                visitedCodes={visitedCodes}
              />
            </div>

            {mediaPins.length > 0 ? (
              <ProfileMediaSections
                username={profile.username}
                displayName={displayName}
                memoryPins={mediaPins}
                isOwnProfile
                visitedCountries={visitedCountries}
                visitedCities={visitedCities}
                visitedParks={visitedParks}
                labels={{
                  photosHeading: profileMessages.myPhotos,
                  instagramHeading: profileMessages.myInstagramLinks,
                  noInstagramYet: profileMessages.noInstagramYet,
                  viewPin: profileMessages.viewPin,
                  viewMap: profileMessages.viewMap,
                  close: profileMessages.closePin,
                  instagramPost: profileMessages.instagramPost,
                  viewAll: profileMessages.allDestinationsAll,
                  editMedia: commonMessages.edit,
                  removeMedia: commonMessages.delete,
                  removePhotoTitle: profileMessages.removePhotoTitle,
                  removePhotoMessage: profileMessages.removePhotoMessage,
                  removeInstagramTitle: profileMessages.removeInstagramTitle,
                  removeInstagramMessage: profileMessages.removeInstagramMessage,
                }}
              />
            ) : null}

            <ProfileSummaryGrid
              summary={summary}
              title={profileMessages.summaryTitle}
              labels={{
                topVisitTitle: profileMessages.summaryTopVisit,
                topVisitEmpty: profileMessages.summaryTopVisitEmpty,
                topVisitSuffix: profileMessages.summaryTopVisitSuffix,
                nextRouteTitle: profileMessages.summaryNextRoute,
                nextRouteEmpty: profileMessages.summaryNextRouteEmpty,
                nextRouteSuffix: profileMessages.summaryNextRouteSuffix,
                countriesTitle: profileMessages.summaryCountries,
                countriesBody: (count) =>
                  formatMessage(profileMessages.summaryCountriesBody, { count }),
                favoritesTitle: profileMessages.summaryFavorites,
                favoritesEmpty: profileMessages.summaryFavoritesEmpty,
                favoritesBody: (count) =>
                  formatMessage(profileMessages.summaryFavoritesBody, { count }),
              }}
            />

            <section className="profile-section account-logout">
              <div className="profile-cta">
                <div>
                  <p className="profile-cta-title">{settingsMessages.accountTitle}</p>
                  <p className="profile-cta-hint">{settingsMessages.logoutHint}</p>
                </div>
                <form
                  action="/auth/signout"
                  method="POST"
                  className="profile-cta-actions account-logout__actions"
                >
                  <button type="submit" className="profile-cta-secondary">
                    {commonMessages.logout}
                  </button>
                </form>
              </div>
            </section>
          </main>
        </div>
      </div>
    </TravelMapFocusShell>
  );
}
