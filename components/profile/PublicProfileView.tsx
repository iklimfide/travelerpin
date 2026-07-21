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
import { isDemoProfileUsername } from "@/lib/data/jennifer-demo-page";
import {
  BADGE_TIER_THEMES,
  getTravelerBadgeTier,
} from "@/lib/utils/traveler-badge";
import { computeTravelUpdateDelta } from "@/lib/utils/travel-update";
import { ProfileTravelUpdateCard } from "@/components/profile/ProfileTravelUpdateCard";
import { ProfileTravelUpdateSection } from "@/components/profile/ProfileTravelUpdateSection";
import { ProfileNextRouteSection } from "@/components/profile/ProfileNextRouteSection";
import { ProfileVisitorDestinations } from "@/components/profile/ProfileVisitorDestinations";
import { ProfileTripsRow } from "@/components/profile/ProfileTripsRow";
import { ProfilePublicPreviewBanner } from "@/components/profile/ProfilePublicPreviewBanner";
import {
  buildProfileTrips,
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

  const cityHeroImages = await getCachedCityHeroImageMap();
  const trips = buildProfileTrips(
    visitedCountries,
    visitedCities,
    visitedParks,
    profile.residence,
    visitedCodes,
    locale === "tr" ? "tr" : "en",
    cityHeroImages
  );
  const mediaPins = buildProfileMediaPins(visitedCities, visitedParks, profile);
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
  const heroTitle = t("travelDiaryTitle", { name: mapOwnerName });
  const badgeTier = getTravelerBadgeTier(stats.countries);
  const badgeLabel = badgeTier ? tBadge(badgeTier) : null;
  const badgeShellClassName = badgeTier ? BADGE_TIER_THEMES[badgeTier].shell : "";

  const profileBody = (
    <div className={`profile-page${embedded ? " profile-page--embedded" : ""}`}>
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
              stats={stats}
              isOwnProfile={isOwnProfile}
              countryCount={stats.countries}
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
                  allHref={withProfilePublicPreview(profileAllPath(profile.username), previewAsPublic)}
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
                allHref={
                  hasMapContent
                    ? withProfilePublicPreview(profileAllPath(profile.username), previewAsPublic)
                    : undefined
                }
                clampToPrimaryColumn={!isOwnProfile}
                badgeLabels={{
                  recent: t("tripBadgeRecent"),
                  favorite: t("tripBadgeFavorite"),
                  dayTrip: t("tripBadgeDayTrip"),
                }}
              />

              {(isOwnProfile && ownerTools) ||
              (!isOwnProfile &&
                (visitedCodes.length > 0 ||
                  visitedCities.length > 0 ||
                  visitedParks.length > 0)) ? (
                <div className="profile-dashboard-tools">
                  {isOwnProfile ? (
                    ownerTools
                  ) : (
                    <ProfileVisitorDestinations
                      username={profile.username}
                      residence={profile.residence}
                      visitedCountries={visitedCountries}
                      visitedCities={visitedCities}
                      visitedParks={visitedParks}
                      visitedCodes={visitedCodes}
                      labels={{
                        countriesTitle: t("visitorVisitedCountries", { name: displayName }),
                        citiesTitle: t("visitorVisitedCities", { name: displayName }),
                        parksTitle: t("visitorVisitedParks", { name: displayName }),
                        countriesCount: t("visitorCountCountries", {
                          count: visitedCodes.length,
                        }),
                        citiesCount: t("visitorCountCities", {
                          count: visitedCities.length,
                        }),
                        parksCount: t("visitorCountParks", {
                          count: visitedParks.length,
                        }),
                        show: t("ownerShow"),
                        viewAll: t("allDestinationsAll"),
                      }}
                    />
                  )}
                </div>
              ) : null}

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

              <ProfileNextRouteSection
                initialStops={parseNextRoute(profile.next_route)}
                isOwnProfile={isOwnProfile}
                visitedCountries={visitedCountries}
                visitedCities={visitedCities}
              />

              {!isOwnProfile && isGuest && hasMapContent ? (
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

            </>
          ) : null}
        </main>
      </div>
    </div>
  );

  return profileBody;
}
