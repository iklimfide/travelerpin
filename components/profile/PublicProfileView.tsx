import { Link } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { HomeFeatures } from "@/components/home/HomeFeatures";
import { ProfileHeroCover } from "@/components/profile/ProfileHeroCover";
import { ProfileIdentityCard } from "@/components/profile/ProfileIdentityCard";
import { ProfileMapPanel } from "@/components/profile/ProfileMapPanel";
import { ProfileSquareCaptureHeader } from "@/components/profile/ProfileSquareCaptureHeader";
import { ProfileMediaSections } from "@/components/profile/ProfileMediaSections";
import { getCachedCityHeroImageMap } from "@/lib/city/city-hero-images";
import { getCachedParkHeroImageMap } from "@/lib/park/park-hero-images";
import { isDemoProfileUsername } from "@/lib/data/demo-profile-username";
import { syncJenniferDemoPresentation } from "@/lib/data/jennifer-demo-display";
import { buildJenniferProfileMediaPins } from "@/lib/data/jennifer-demo-media";
import {
  BADGE_TIER_THEMES,
  getTravelerBadgeTier,
} from "@/lib/utils/traveler-badge";
import { computeTravelUpdateDelta } from "@/lib/utils/travel-update";
import { ProfileTravelUpdateCard } from "@/components/profile/ProfileTravelUpdateCard";
import { ProfileTravelUpdateSection } from "@/components/profile/ProfileTravelUpdateSection";
import { ProfileNextRouteSection } from "@/components/profile/ProfileNextRouteSection";
import { ProfileTripsRow } from "@/components/profile/ProfileTripsRow";
import { ProfilePublicPreviewBanner } from "@/components/profile/ProfilePublicPreviewBanner";
import {
  buildProfileAllDestinations,
} from "@/lib/utils/profile-all-destinations";
import {
  WORLD_COUNTRY_TOTAL,
} from "@/lib/utils/profile-page";
import { buildProfileMediaPins } from "@/lib/utils/profile-media";
import { resolveResidenceCityHref } from "@/lib/utils/residence-city";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { parseNextRoute } from "@/lib/utils/next-route";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { mapTitleOwnerName } from "@/lib/i18n/turkish-genitive";
import { profileAllPath, profilePath } from "@/lib/seo/site";
import { withProfilePublicPreview } from "@/lib/profile/public-preview";
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
  previewAsPublic?: boolean;
  /** Animate stat counters from zero (homepage embedded demo). */
  animateStats?: boolean;
  /** Homepage left column renders next route separately. */
  omitNextRoute?: boolean;
  /** Show only photos, only Instagram, or both (default). */
  mediaSections?: "both" | "photos" | "instagram";
};

export async function PublicProfileView({
  data,
  profileDescription,
  isOwnProfile,
  isGuest,
  ownerTools,
  embedded = false,
  profilePageHref,
  previewAsPublic = false,
  animateStats = false,
  omitNextRoute = false,
  mediaSections = "both",
}: PublicProfileViewProps) {
  const [t, tHome, tCommon, tBadge, locale] = await Promise.all([
    getTranslations("profile"),
    getTranslations("home"),
    getTranslations("common"),
    getTranslations("badge"),
    getLocale(),
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
  const localeCode: Locale = isLocale(locale) ? locale : "en";
  const mapOwnerName = mapTitleOwnerName(displayName, localeCode);
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

  const [cityHeroImages, parkHeroImages] = await Promise.all([
    getCachedCityHeroImageMap(),
    getCachedParkHeroImageMap(),
  ]);
  const destinations = buildProfileAllDestinations(
    visitedCountries,
    visitedCities,
    visitedParks,
    visibleWishlistCountries,
    visitedCodes,
    profile.residence,
    localeCode,
    cityHeroImages,
    parkHeroImages
  );
  const isDemoProfile = isDemoProfileUsername(profile.username);
  const demoPresentation = isDemoProfile
    ? syncJenniferDemoPresentation(stats, destinations, localeCode)
    : null;
  const profileStats = demoPresentation?.stats ?? stats;
  const profileDestinations = demoPresentation?.destinations ?? destinations;
  const mediaPins = isDemoProfile
    ? buildJenniferProfileMediaPins(
        visitedCities,
        visitedParks,
        profile,
        cityHeroImages,
        parkHeroImages
      )
    : buildProfileMediaPins(visitedCities, visitedParks, profile);
  const showEmbeddedDemoSections = embedded && isDemoProfile;
  const showProfileBelowFold = !embedded || showEmbeddedDemoSections;
  const showTravelUpdateCard =
    (isOwnProfile || isDemoProfile) && (!embedded || isDemoProfile);
  const demoTravelDelta = computeTravelUpdateDelta(
    null,
    profileStats,
    visitedCodes,
    visitedCountries,
    visitedCities,
    visitedParks
  );
  const demoProfileHref = profilePageHref ?? (embedded && isDemoProfile ? profilePath(profile.username) : undefined);
  const residenceHref = resolveResidenceCityHref(profile.residence);
  const heroTitle = t("travelDiaryTitle", { name: mapOwnerName });
  const badgeTier = getTravelerBadgeTier(profileStats.countries);
  const badgeLabel = badgeTier ? tBadge(badgeTier) : null;
  const badgeShellClassName = badgeTier ? BADGE_TIER_THEMES[badgeTier].shell : "";

  const profileBody = (
    <div
      className={`profile-page${embedded ? " profile-page--embedded" : ""}${
        showEmbeddedDemoSections ? " profile-page--embedded-demo" : ""
      }`}
    >
      {previewAsPublic ? <ProfilePublicPreviewBanner username={profile.username} /> : null}
      <div className="profile-shell">
        <div
          id={`profile-story-capture-${profile.username.toLowerCase()}`}
          className="profile-story-capture"
        >
          <ProfileHeroCover
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
              residence={profile.residence}
              residenceHref={residenceHref}
              instagramUrl={profile.instagram_url}
              instagramSampleNotice={
                isDemoProfile ? t("sampleInstagramNotice", { name: displayName }) : null
              }
              stats={profileStats}
              isOwnProfile={isOwnProfile}
              countryCount={profileStats.countries}
              profileHref={demoProfileHref}
              labels={{
                countries: t("statCountriesShort"),
                cities: t("statCitiesShort"),
                nationalParks: t("statNationalParksShort"),
                themeParks: t("statThemeParksShort"),
              }}
              followUsername={!isOwnProfile ? profile.username : undefined}
              followState={followState}
              canFollow={canFollow}
              isLoggedIn={isLoggedIn}
              previewAsPublic={previewAsPublic}
              animateStats={animateStats}
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
                  countryCount={profileStats.countries}
                  instagramUrl={profile.instagram_url}
                  instagramSampleNotice={
                    isDemoProfile ? t("sampleInstagramNotice", { name: displayName }) : null
                  }
                  stats={profileStats}
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
                  countryCount={profileStats.countries}
                  exploredBadgeLabel={t("mapExploredBadge")}
                  allHref={withProfilePublicPreview(profileAllPath(profile.username), previewAsPublic)}
                  allAriaLabel={t("mapViewAll")}
                  animateCountryCount={animateStats}
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
                stats={profileStats}
                visitedCountries={visitedCountries}
                visitedCities={visitedCities}
                visitedParks={visitedParks}
                visitedCodes={visitedCodes}
              />
            ) : (
              <ProfileTravelUpdateCard
                username={profile.username}
                displayName={displayName}
                stats={profileStats}
                delta={demoTravelDelta}
                isOwnProfile={false}
                persistShareSnapshot={false}
              />
            )
          ) : null}

          {showProfileBelowFold ? (
            <>
              <ProfileTripsRow
                destinations={profileDestinations}
                displayName={displayName}
                isOwnProfile={isOwnProfile}
                badgeLabels={{
                  recent: t("tripBadgeRecent"),
                  favorite: t("tripBadgeFavorite"),
                  dayTrip: t("tripBadgeDayTrip"),
                }}
              />

              {isOwnProfile && ownerTools ? (
                <div className="profile-dashboard-tools">{ownerTools}</div>
              ) : null}

              <ProfileMediaSections
                displayName={displayName}
                memoryPins={mediaPins}
                isOwnProfile={isOwnProfile}
                visitedCountries={visitedCountries}
                visitedCities={visitedCities}
                visitedParks={visitedParks}
                sections={mediaSections}
                labels={{
                  photosHeading: isOwnProfile
                    ? t("myPhotos")
                    : t("visitorPhotos", { name: displayName }),
                  instagramHeading: isOwnProfile
                    ? t("myInstagramLinks")
                    : t("visitorInstagramLinks", { name: displayName }),
                  noPhotosYet: isOwnProfile
                    ? t("noPhotosYet")
                    : t("visitorNoPhotosYet", { name: displayName }),
                  noInstagramYet: isOwnProfile
                    ? t("noInstagramYet")
                    : t("visitorNoInstagramYet", { name: displayName }),
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

              {!omitNextRoute ? (
                <ProfileNextRouteSection
                  initialStops={parseNextRoute(profile.next_route)}
                  initialTotalDays={profile.next_route_total_days}
                  initialTransport={profile.next_route_transport}
                  isOwnProfile={isOwnProfile}
                  displayName={displayName}
                  username={profile.username}
                  avatarUrl={profile.avatar_url}
                  visitedCountries={visitedCountries}
                  visitedCities={visitedCities}
                />
              ) : null}

              {!embedded && !isOwnProfile && isGuest && hasMapContent ? (
                <section className="profile-section">
                  <HomeFeatures />
                </section>
              ) : null}

              {!embedded && !isOwnProfile && isGuest ? (
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

            </>
          ) : null}
        </main>
      </div>
    </div>
  );

  return profileBody;
}
