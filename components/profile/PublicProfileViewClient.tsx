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
import { fetchHeroImageMaps, readCachedCityHeroImages, readCachedParkHeroImages } from "@/lib/client/hero-images-cache";
import { useProgressiveStatCount } from "@/lib/hooks/useProgressiveStatCount";
import { useProfileStatsAnimationEnabled } from "@/lib/hooks/useProfileStatsAnimationEnabled";
import { computeTravelUpdateDelta } from "@/lib/utils/travel-update";
import { ProfileTravelUpdateCard } from "@/components/profile/ProfileTravelUpdateCard";
import { ProfileNextRouteSection } from "@/components/profile/ProfileNextRouteSection";
import { ProfileTripsRow } from "@/components/profile/ProfileTripsRow";
import { ProfilePublicPreviewBanner } from "@/components/profile/ProfilePublicPreviewBanner";
import { buildProfileAllDestinations } from "@/lib/utils/profile-all-destinations";
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
  PROFILE_STATS_LOADING_PLACEHOLDER,
  type PublicProfilePageData,
  type PublicProfileShellData,
} from "@/lib/supabase/profile-page-types";

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

  const resolvedStats = fullData?.stats ?? null;
  const animateStats = useProfileStatsAnimationEnabled(progressive);
  const animatedCountries = useProgressiveStatCount(
    resolvedStats?.countries ?? null,
    PROFILE_STATS_LOADING_PLACEHOLDER.countries,
    animateStats
  );
  const animatedCities = useProgressiveStatCount(
    resolvedStats?.cities ?? null,
    PROFILE_STATS_LOADING_PLACEHOLDER.cities,
    animateStats
  );
  const animatedNationalParks = useProgressiveStatCount(
    resolvedStats?.nationalParks ?? null,
    PROFILE_STATS_LOADING_PLACEHOLDER.nationalParks,
    animateStats
  );
  const animatedThemeParks = useProgressiveStatCount(
    resolvedStats?.themeParks ?? null,
    PROFILE_STATS_LOADING_PLACEHOLDER.themeParks,
    animateStats
  );
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


  const mapPinsReady = Boolean(fullData);
  const mapVisitedCountries = mapPinsReady ? visitedCountries : [];
  const mapVisitedCodes = mapPinsReady ? visitedCodes : [];
  const mapCountryCount = animateStats ? animatedCountries : data.stats.countries;

  const hasMapContent =
    pinsLoading ||
    visitedCountries.length > 0 ||
    visitedCities.length > 0 ||
    visitedParks.length > 0 ||
    visibleWishlistCodes.length > 0;
  const showEmptyMapState = !pinsLoading && !hasMapContent;

  const [cityHeroImages, setCityHeroImages] = useState<Map<string, string>>(
    () => readCachedCityHeroImages() ?? new Map()
  );
  const [parkHeroImages, setParkHeroImages] = useState<Map<string, string>>(
    () => readCachedParkHeroImages() ?? new Map()
  );

  useEffect(() => {
    if (progressive && !fullData) return;

    let cancelled = false;
    void fetchHeroImageMaps()
      .then(({ cityHeroImages: cityMap, parkHeroImages: parkMap }) => {
        if (cancelled) return;
        setCityHeroImages(cityMap);
        setParkHeroImages(parkMap);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fullData, progressive]);

  const destinations = useMemo(
    () =>
      buildProfileAllDestinations(
        visitedCountries,
        visitedCities,
        visitedParks,
        visibleWishlistCountries,
        visitedCodes,
        profile.residence,
        locale,
        cityHeroImages,
        parkHeroImages
      ),
    [
      visitedCountries,
      visitedCities,
      visitedParks,
      visibleWishlistCountries,
      visitedCodes,
      profile.residence,
      locale,
      cityHeroImages,
      parkHeroImages,
    ]
  );

  const destinationCount =
    destinations.countries.length +
    destinations.cities.length +
    destinations.parks.length +
    destinations.wishlist.length;

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
              followUsername={!isOwnProfile ? profile.username : undefined}
              followState={followState}
              canFollow={fullData ? canFollow : false}
              isLoggedIn={isLoggedIn}
              previewAsPublic={previewAsPublic}
            />

            {hasMapContent ? (
              <div
                id={`profile-square-capture-${profile.username.toLowerCase()}`}
                className="profile-square-capture"
              >
                {fullData ? (
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
                ) : null}
                <ProfileMapPanel
                  visitedCountryCodes={mapVisitedCodes}
                  wishlistCountryCodes={visibleWishlistCodes}
                  visitedCountries={mapVisitedCountries}
                  wishlistCountries={visibleWishlistCountries}
                  visitedCities={mapPinsReady ? visitedCities : []}
                  visitedParks={mapPinsReady ? visitedParks : []}
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
              {(!progressive || fullData) && destinationCount > 0 ? (
                <ProfileTripsRow
                  destinations={destinations}
                  displayName={displayName}
                  isOwnProfile={isOwnProfile}
                  badgeLabels={{
                    recent: t("tripBadgeRecent"),
                    favorite: t("tripBadgeFavorite"),
                    dayTrip: t("tripBadgeDayTrip"),
                  }}
                />
              ) : null}

              {(!progressive || fullData) && isOwnProfile && resolvedOwnerTools ? (
                <div className="profile-dashboard-tools">{resolvedOwnerTools}</div>
              ) : null}

              {(!progressive || fullData) ? (
                <ProfileMediaSections
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
