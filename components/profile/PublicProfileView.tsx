import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { TravelMapFocusShell } from "@/components/map/TravelMapFocusShell";
import { HomeFeatures } from "@/components/home/HomeFeatures";
import { ProfileHeroCover } from "@/components/profile/ProfileHeroCover";
import { ProfileIdentityCard } from "@/components/profile/ProfileIdentityCard";
import { ProfileMapPanel } from "@/components/profile/ProfileMapPanel";
import { ProfileSquareCaptureHeader } from "@/components/profile/ProfileSquareCaptureHeader";
import { ProfileMediaSections } from "@/components/profile/ProfileMediaSections";
import { ProfileSummaryGrid } from "@/components/profile/ProfileSummaryGrid";
import { BRAND } from "@/lib/constants";
import { isDemoProfileUsername } from "@/lib/data/jennifer-demo-page";
import {
  BADGE_TIER_THEMES,
  getTravelerBadgeTier,
} from "@/lib/utils/traveler-badge";
import { computeTravelUpdateDelta } from "@/lib/utils/travel-update";
import { ProfileTravelUpdateCard } from "@/components/profile/ProfileTravelUpdateCard";
import { ProfileTravelUpdateSection } from "@/components/profile/ProfileTravelUpdateSection";
import { ProfileTripsRow } from "@/components/profile/ProfileTripsRow";
import { PublicGuestAuthLinks } from "@/components/nav/PublicGuestAuthLinks";
import { LogOutButton } from "@/components/auth/LogOutButton";
import {
  buildProfileSummary,
  buildProfileTrips,
  WORLD_COUNTRY_TOTAL,
} from "@/lib/utils/profile-page";
import { buildProfileMediaPins } from "@/lib/utils/profile-media";
import { resolveResidenceCityHref } from "@/lib/utils/residence-city";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { profileAllPath, profilePath } from "@/lib/seo/site";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";

type PublicProfileViewProps = {
  data: PublicProfilePageData;
  profileDescription: string;
  isOwnProfile: boolean;
  isGuest: boolean;
  ownerTools?: ReactNode;
  /** Landing page: show hero + identity + map only, without extra marketing blocks. */
  embedded?: boolean;
  /** When set (e.g. home demo), avatar, name, and hero title link to the full profile. */
  profilePageHref?: string;
};

export async function PublicProfileView({
  data,
  profileDescription,
  isOwnProfile,
  isGuest,
  ownerTools,
  embedded = false,
  profilePageHref,
}: PublicProfileViewProps) {
  const [t, tHome, tCommon, tBadge] = await Promise.all([
    getTranslations("profile"),
    getTranslations("home"),
    getTranslations("common"),
    getTranslations("badge"),
  ]);

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
    followState,
    canFollow,
  } = data;

  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
  const wishlistPublic = profile.wishlist_public;
  const visibleWishlistCountries =
    isOwnProfile || wishlistPublic ? wishlistCountries : [];
  const visibleWishlistCodes =
    isOwnProfile || wishlistPublic ? wishlistCodes : [];
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
  const isDemoProfile = isDemoProfileUsername(profile.username);
  const showTravelUpdateCard =
    (isOwnProfile || isDemoProfile) && (!embedded || isDemoProfile);
  const demoTravelDelta = computeTravelUpdateDelta(
    null,
    stats,
    visitedCodes,
    visitedCountries,
    visitedCities,
    visitedParks
  );
  const demoProfileHref = profilePageHref ?? (embedded && isDemoProfile ? profilePath(profile.username) : undefined);
  const residenceHref = resolveResidenceCityHref(profile.residence);
  const heroTitle = t("travelDiaryTitle", { name: displayName });
  const badgeTier = getTravelerBadgeTier(stats.countries);
  const badgeLabel = badgeTier ? tBadge(badgeTier) : null;
  const badgeShellClassName = badgeTier ? BADGE_TIER_THEMES[badgeTier].shell : "";

  const profileBody = (
    <div className={`profile-page${embedded ? " profile-page--embedded" : ""}`}>
      {isGuest && !embedded ? (
        <div className="profile-guest-auth-bar">
          <PublicGuestAuthLinks
            loginHref={`/login?next=${encodeURIComponent(profilePath(profile.username))}`}
            registerHref={`/register?next=${encodeURIComponent(profilePath(profile.username))}`}
            loginLabel={tCommon("login")}
            registerLabel={tCommon("register")}
            className="home-guest-auth"
            linkClassName="home-guest-auth__link"
            primaryClassName="home-guest-auth__link home-guest-auth__link--primary"
          />
        </div>
      ) : null}
      <div className="profile-shell">
        <div
          id={`profile-story-capture-${profile.username.toLowerCase()}`}
          className="profile-story-capture"
        >
          <ProfileHeroCover
            residence={profile.residence}
            residenceHref={residenceHref}
            heroTitle={heroTitle}
            heroSubtitle={
              isOwnProfile
                ? t("travelDiarySubtitle")
                : t("travelDiarySubtitleVisitor", { name: displayName })
            }
          />

          <div className="profile-main">
            <ProfileIdentityCard
              avatarUrl={profile.avatar_url}
              displayName={displayName}
              username={profile.username}
              bio={profile.bio}
              instagramUrl={profile.instagram_url}
              instagramSampleNotice={
                isDemoProfile ? t("sampleInstagramNotice", { name: displayName }) : null
              }
              stats={stats}
              isOwnProfile={isOwnProfile}
              countryCount={stats.countries}
              profileHref={demoProfileHref}
              labels={{
                countries: t("statCountriesShort"),
                cities: t("statCitiesShort"),
                nationalParks: t("statNationalParksShort"),
                themeParks: t("statThemeParksShort"),
                share: t("shareProfile"),
              }}
              followUsername={!isOwnProfile ? profile.username : undefined}
              followState={followState}
              canFollow={canFollow}
              isLoggedIn={isLoggedIn}
            />

            {hasMapContent ? (
              <div
                id={`profile-square-capture-${profile.username.toLowerCase()}`}
                className="profile-square-capture"
              >
                <ProfileSquareCaptureHeader
                  avatarUrl={profile.avatar_url}
                  displayName={displayName}
                  username={profile.username}
                  countryCount={stats.countries}
                  instagramUrl={profile.instagram_url}
                  instagramSampleNotice={
                    isDemoProfile ? t("sampleInstagramNotice", { name: displayName }) : null
                  }
                  stats={stats}
                  labels={{
                    countries: t("statCountriesShort"),
                    cities: t("statCitiesShort"),
                    nationalParks: t("statNationalParksShort"),
                    themeParks: t("statThemeParksShort"),
                  }}
                />
                <ProfileMapPanel
                  visitedCountryCodes={visitedCodes}
                  wishlistCountryCodes={visibleWishlistCodes}
                  visitedCountries={visitedCountries}
                  wishlistCountries={visibleWishlistCountries}
                  visitedCities={visitedCities}
                  visitedParks={visitedParks}
                  isLoggedIn={isLoggedIn}
                  canEditMap={isOwnProfile}
                  countryCount={stats.countries}
                  exploredBadgeLabel={t("mapExploredBadge")}
                  allHref={profileAllPath(profile.username)}
                  allAriaLabel={t("mapViewAll")}
                />
              </div>
            ) : (
              <section className="profile-section">
                <p className="profile-empty">{t("noCountries")}</p>
              </section>
            )}
          </div>
        </div>

        <main className="profile-main">
          {showTravelUpdateCard ? (
            isOwnProfile && !embedded ? (
              <ProfileTravelUpdateSection
                profileId={profile.id}
                username={profile.username}
                displayName={displayName}
                stats={stats}
                visitedCountries={visitedCountries}
                visitedCities={visitedCities}
                visitedParks={visitedParks}
                visitedCodes={visitedCodes}
              />
            ) : (
              <ProfileTravelUpdateCard
                username={profile.username}
                displayName={displayName}
                stats={stats}
                delta={demoTravelDelta}
                isOwnProfile={false}
                persistShareSnapshot={false}
              />
            )
          ) : null}

          {!embedded ? (
            <>
              <ProfileTripsRow
                trips={trips}
                title={isOwnProfile ? t("myTrips") : t("visitorTrips", { name: displayName })}
                allLabel={t("tripsAll")}
                allHref={hasMapContent ? profileAllPath(profile.username) : undefined}
                badgeLabels={{
                  recent: t("tripBadgeRecent"),
                  favorite: t("tripBadgeFavorite"),
                  dayTrip: t("tripBadgeDayTrip"),
                }}
              />

              {ownerTools ? (
                <div className="profile-dashboard-tools">{ownerTools}</div>
              ) : null}

              {mediaPins.length > 0 ? (
                <ProfileMediaSections
                  username={profile.username}
                  displayName={displayName}
                  memoryPins={mediaPins}
                  isOwnProfile={isOwnProfile}
                  visitedCountries={visitedCountries}
                  visitedCities={visitedCities}
                  visitedParks={visitedParks}
                  labels={{
                    photosHeading: isOwnProfile
                      ? t("myPhotos")
                      : t("visitorPhotos", { name: displayName }),
                    instagramHeading: isOwnProfile
                      ? t("myInstagramLinks")
                      : t("visitorInstagramLinks", { name: displayName }),
                    noInstagramYet: t("noInstagramYet"),
                    viewPin: t("viewPin"),
                    viewMap: t("viewMap"),
                    close: t("closePin"),
                    instagramPost: t("instagramPost"),
                    viewAll: t("allDestinationsAll"),
                    editMedia: tCommon("edit"),
                    removeMedia: tCommon("delete"),
                    removePhotoTitle: t("removePhotoTitle"),
                    removePhotoMessage: t("removePhotoMessage"),
                    removeInstagramTitle: t("removeInstagramTitle"),
                    removeInstagramMessage: t("removeInstagramMessage"),
                  }}
                />
              ) : null}

              {!isOwnProfile && hasMapContent ? (
                <section className="profile-section">
                  <HomeFeatures />
                </section>
              ) : null}

              {!isOwnProfile && isGuest ? (
                <section className="profile-cta">
                  <div>
                    <p className="profile-cta-title">{tHome("ctaTitle")}</p>
                    <p className="profile-cta-hint">{tHome("ctaHint")}</p>
                  </div>
                  <div className="profile-cta-actions">
                    <Link href="/register" className="profile-cta-primary">
                      {t("createYourMap")}
                    </Link>
                    <Link href="/login" className="profile-cta-secondary">
                      {tHome("login")}
                    </Link>
                  </div>
                </section>
              ) : null}

              <ProfileSummaryGrid
                summary={summary}
                title={t("summaryTitle")}
                labels={{
                  topVisitTitle: t("summaryTopVisit"),
                  topVisitEmpty: t("summaryTopVisitEmpty"),
                  topVisitSuffix: t("summaryTopVisitSuffix"),
                  nextRouteTitle: t("summaryNextRoute"),
                  nextRouteEmpty: t("summaryNextRouteEmpty"),
                  nextRouteSuffix: t("summaryNextRouteSuffix"),
                  countriesTitle: t("summaryCountries"),
                  countriesBody: (count) => t("summaryCountriesBody", { count }),
                  favoritesTitle: t("summaryFavorites"),
                  favoritesEmpty: t("summaryFavoritesEmpty"),
                  favoritesBody: (count) => t("summaryFavoritesBody", { count }),
                }}
              />

              {isOwnProfile ? <LogOutButton variant="profile" /> : null}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );

  if (embedded) {
    return profileBody;
  }

  return (
    <TravelMapFocusShell>
      {profileBody}
    </TravelMapFocusShell>
  );
}
