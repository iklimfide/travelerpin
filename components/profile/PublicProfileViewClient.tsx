"use client";

import { Link } from "@/lib/i18n/navigation";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ProfileOwnerTools } from "@/components/dashboard/ProfileOwnerTools";
import { HomeFeaturesClient } from "@/components/home/HomeFeaturesClient";
import { ProfileHeroCover } from "@/components/profile/ProfileHeroCover";
import { ProfileIdentityCard } from "@/components/profile/ProfileIdentityCard";
import { ProfileMapPanel } from "@/components/profile/ProfileMapPanel";
import { ProfileSquareCaptureHeader } from "@/components/profile/ProfileSquareCaptureHeader";
import { ProfileMediaSections } from "@/components/profile/ProfileMediaSections";
import { isDemoProfileUsername } from "@/lib/data/demo-profile-username";
import { usePublicProfileProgressiveLoad } from "@/lib/client/use-public-profile-progressive-load";
import { useAnimatedCount } from "@/lib/hooks/useAnimatedCount";
import { useProgressiveReveal } from "@/lib/hooks/useProgressiveReveal";
import { computeTravelUpdateDelta } from "@/lib/utils/travel-update";
import { ProfileTravelUpdateCard } from "@/components/profile/ProfileTravelUpdateCard";
import { ProfileNextRouteSection } from "@/components/profile/ProfileNextRouteSection";
import { ProfileVisitorDestinations } from "@/components/profile/ProfileVisitorDestinations";
import { ProfileTripsRow } from "@/components/profile/ProfileTripsRow";
import { ProfilePublicPreviewBanner } from "@/components/profile/ProfilePublicPreviewBanner";
import { buildProfileTrips } from "@/lib/utils/profile-page";
import { buildProfileMediaPins } from "@/lib/utils/profile-media";
import { resolveResidenceCityHref } from "@/lib/utils/residence-city";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { parseNextRoute } from "@/lib/utils/next-route";
import { useTranslateCommon, useTranslateHome, useTranslateProfile } from "@/lib/i18n/client-messages";
import { mapTitleOwnerName } from "@/lib/i18n/turkish-genitive";
import { profileAllPath, profilePath } from "@/lib/seo/site";
import {
  applyPublicPreviewToProfileData,
  withProfilePublicPreview,
} from "@/lib/profile/public-preview";
import {
  EMPTY_TRAVEL_STATS,
  type PublicProfilePageData,
  type PublicProfileShellData,
} from "@/lib/supabase/profile-page-types";

const INITIAL_MAP_FLAGS = 5;
const INITIAL_TRIPS = 3;

type PublicProfileViewClientProps = {
  shell?: PublicProfileShellData;
  data?: PublicProfilePageData;
  progressiveLoad?: boolean;
  isOwnProfile: boolean;
  isGuest: boolean;
  ownerTools?: ReactNode;
  embedded?: boolean;
  profilePageHref?: string;
  previewAsPublic?: boolean;
};

export function PublicProfileViewClient({
  shell,
  data: initialFullData,
  progressiveLoad = false,
  isOwnProfile,
  isGuest,
  ownerTools,
  embedded = false,
  profilePageHref,
  previewAsPublic = false,
}: PublicProfileViewClientProps) {
  const t = useTranslateProfile();
  const tHome = useTranslateHome();
  const tCommon = useTranslateCommon();
  const locale = useLocale() === "tr" ? "tr" : "en";

  const progressive = progressiveLoad && Boolean(shell);
  const loadShell =
    shell ??
    ({
      profile: initialFullData!.profile,
      isLoggedIn: initialFullData!.isLoggedIn,
      currentUsername: initialFullData!.currentUsername,
    } satisfies PublicProfileShellData);
  const progressiveState = usePublicProfileProgressiveLoad(loadShell, progressive);

  const rawData = progressive ? progressiveState.data : initialFullData!;
  const fullData = progressive ? progressiveState.fullData : initialFullData ?? null;
  const pinsLoading = progressive && progressiveState.loading;

  const data = useMemo(() => {
    if (!previewAsPublic || !fullData) return rawData;
    return applyPublicPreviewToProfileData(fullData);
  }, [fullData, previewAsPublic, rawData]);

  const statTargets = fullData?.stats ?? EMPTY_TRAVEL_STATS;
  const animateStats = progressive;
  const animatedCountries = useAnimatedCount(statTargets.countries, animateStats);
  const animatedCities = useAnimatedCount(statTargets.cities, animateStats);
  const animatedNationalParks = useAnimatedCount(statTargets.nationalParks, animateStats);
  const animatedThemeParks = useAnimatedCount(statTargets.themeParks, animateStats);
  const displayStats = animateStats
    ? {
        countries: animatedCountries,
        cities: animatedCities,
        nationalParks: animatedNationalParks,
        themeParks: animatedThemeParks,
      }
    : data.stats;

  const {
    profile,
    visitedCountries,
    visitedCities,
    visitedParks,
    wishlistCountries,
    visitedCodes,
    wishlistCodes,
    isLoggedIn,
    followState,
    canFollow,
  } = data;

  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
  const mapOwnerName = mapTitleOwnerName(displayName, locale);
  const wishlistPublic = profile.wishlist_public;
  const visibleWishlistCountries =
    isOwnProfile || wishlistPublic ? wishlistCountries : [];
  const visibleWishlistCodes =
    isOwnProfile || wishlistPublic ? wishlistCodes : [];

  const revealPins = progressive && Boolean(fullData);
  const progressiveCountries = useProgressiveReveal(visitedCountries, {
    enabled: revealPins,
    initial: INITIAL_MAP_FLAGS,
  });
  const progressiveCodes = useProgressiveReveal(visitedCodes, {
    enabled: revealPins,
    initial: INITIAL_MAP_FLAGS,
  });

  const mapVisitedCountries = revealPins ? progressiveCountries : visitedCountries;
  const mapVisitedCodes = revealPins ? progressiveCodes : visitedCodes;
  const mapCountryCount = animateStats ? animatedCountries : data.stats.countries;
  const pinsFullyRevealed =
    !revealPins ||
    (progressiveCodes.length >= visitedCodes.length &&
      progressiveCountries.length >= visitedCountries.length);

  const hasMapContent =
    pinsLoading ||
    visitedCountries.length > 0 ||
    visitedCities.length > 0 ||
    visitedParks.length > 0 ||
    visibleWishlistCodes.length > 0;
  const showEmptyMapState = !pinsLoading && !hasMapContent;

  const [cityHeroImages, setCityHeroImages] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    if (progressive && !fullData) return;

    let cancelled = false;
    fetch("/api/city-hero-images")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.images) return;
        setCityHeroImages(new Map(Object.entries(payload.images as Record<string, string>)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fullData, progressive]);

  const trips = useMemo(
    () =>
      buildProfileTrips(
        visitedCountries,
        visitedCities,
        visitedParks,
        profile.residence,
        visitedCodes,
        locale,
        cityHeroImages
      ),
    [
      visitedCountries,
      visitedCities,
      visitedParks,
      profile.residence,
      visitedCodes,
      locale,
      cityHeroImages,
    ]
  );
  const visibleTrips = useProgressiveReveal(trips, {
    enabled: revealPins,
    initial: INITIAL_TRIPS,
    step: 3,
  });
  const displayTrips = revealPins ? visibleTrips : trips;

  const mediaPins = buildProfileMediaPins(visitedCities, visitedParks, profile);
  const isDemoProfile = isDemoProfileUsername(profile.username);
  const showTravelUpdateCard =
    (isOwnProfile || isDemoProfile) && (!embedded || isDemoProfile);
  const travelDelta = computeTravelUpdateDelta(
    null,
    data.stats,
    visitedCodes,
    visitedCountries,
    visitedCities,
    visitedParks
  );
  const demoProfileHref =
    profilePageHref ?? (embedded && isDemoProfile ? profilePath(profile.username) : undefined);
  const residenceHref = resolveResidenceCityHref(profile.residence);
  const heroTitle = t("travelDiaryTitle", { name: mapOwnerName });
  const resolvedOwnerTools =
    ownerTools ??
    (isOwnProfile && fullData ? (
      <ProfileOwnerTools
        visitedCountries={fullData.visitedCountries}
        visitedCities={fullData.visitedCities}
        visitedParks={fullData.visitedParks}
        wishlistCountries={fullData.wishlistCountries}
        visitedCodes={fullData.visitedCodes}
      />
    ) : undefined);

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
              stats={displayStats}
              isOwnProfile={isOwnProfile}
              countryCount={mapCountryCount}
              profileHref={demoProfileHref}
              labels={{
                countries: t("statCountriesShort"),
                cities: t("statCitiesShort"),
                nationalParks: t("statNationalParksShort"),
                themeParks: t("statThemeParksShort"),
              }}
              followUsername={!isOwnProfile && fullData ? profile.username : undefined}
              followState={fullData ? followState : null}
              canFollow={fullData ? canFollow : false}
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
                  countryCount={data.stats.countries}
                  instagramUrl={profile.instagram_url}
                  instagramSampleNotice={
                    isDemoProfile ? t("sampleInstagramNotice", { name: displayName }) : null
                  }
                  stats={data.stats}
                  labels={{
                    countries: t("statCountriesShort"),
                    cities: t("statCitiesShort"),
                    nationalParks: t("statNationalParksShort"),
                    themeParks: t("statThemeParksShort"),
                  }}
                />
                <ProfileMapPanel
                  visitedCountryCodes={mapVisitedCodes}
                  wishlistCountryCodes={visibleWishlistCodes}
                  visitedCountries={mapVisitedCountries}
                  wishlistCountries={visibleWishlistCountries}
                  visitedCities={pinsFullyRevealed ? visitedCities : []}
                  visitedParks={pinsFullyRevealed ? visitedParks : []}
                  isLoggedIn={isLoggedIn}
                  canEditMap={isOwnProfile}
                  countryCount={mapCountryCount}
                  exploredBadgeLabel={t("mapExploredBadge")}
                  allHref={withProfilePublicPreview(profileAllPath(profile.username), previewAsPublic)}
                  allAriaLabel={t("mapViewAll")}
                />
              </div>
            ) : showEmptyMapState ? (
              <section className="profile-section">
                <p className="profile-empty">{t("noCountries")}</p>
              </section>
            ) : null}
          </div>
        </div>

        <main className="profile-main">
          {showTravelUpdateCard && (!progressive || fullData) ? (
            <ProfileTravelUpdateCard
              username={profile.username}
              displayName={displayName}
              stats={data.stats}
              delta={travelDelta}
              isOwnProfile={isOwnProfile}
              persistShareSnapshot={isOwnProfile}
            />
          ) : null}

          {!embedded ? (
            <>
              {(!progressive || fullData) && displayTrips.length > 0 ? (
                <ProfileTripsRow
                  trips={displayTrips}
                  title={isOwnProfile ? t("myTrips") : t("visitorTrips", { name: displayName })}
                  allLabel={t("tripsAll")}
                  allHref={
                    hasMapContent && !showEmptyMapState
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
              ) : null}

              {(!progressive || fullData) &&
              ((isOwnProfile && resolvedOwnerTools) ||
                (!isOwnProfile &&
                  (visitedCodes.length > 0 ||
                    visitedCities.length > 0 ||
                    visitedParks.length > 0))) ? (
                <div className="profile-dashboard-tools">
                  {isOwnProfile ? (
                    resolvedOwnerTools
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

              {(!progressive || fullData) ? (
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
              ) : null}

              {(!progressive || fullData) ? (
                <ProfileNextRouteSection
                  initialStops={parseNextRoute(profile.next_route)}
                  isOwnProfile={isOwnProfile}
                  visitedCountries={visitedCountries}
                  visitedCities={visitedCities}
                />
              ) : null}

              {!isOwnProfile && isGuest && hasMapContent && !showEmptyMapState && (!progressive || fullData) ? (
                <section className="profile-section">
                  <HomeFeaturesClient />
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
