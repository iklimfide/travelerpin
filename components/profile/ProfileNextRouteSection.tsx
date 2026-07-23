"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useDashboardAdd } from "@/components/dashboard/DashboardAddProvider";
import { useNextRouteDestination } from "@/components/add/NextRouteDestinationProvider";
import { ProfileNextRouteSectionSkeleton } from "@/components/skeletons/ProfileNextRouteSectionSkeleton";
import {
  NEXT_ROUTE_CHANGED_EVENT,
  PROFILE_DATA_STALE_EVENT,
  readOwnNextRouteCache,
  writeOwnNextRouteCache,
} from "@/lib/client/session-page-cache";
import {
  fetchNextRoute,
  persistMarkNextRouteStopVisited,
  persistNextRoute,
  persistNextRouteStops,
} from "@/lib/client/next-route-state";
import { useModal } from "@/components/ui/ModalProvider";
import { useAppMessages, formatMessage } from "@/lib/i18n/client-messages";
import { turkishGenitiveName } from "@/lib/i18n/turkish-genitive";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import { canonicalCityKey } from "@/lib/utils/city-aliases";
import {
  areNextRoutePayloadsEqual,
  getNextRouteStopDisplay,
  NEXT_ROUTE_MAX_TOTAL_DAYS,
  NEXT_ROUTE_TRANSPORT_MODES,
  parseNextRoutePayload,
  stopDedupeKey,
} from "@/lib/utils/next-route";
import { useToast } from "@/components/ui/ToastProvider";
import { downloadProfileNextRouteCardPng } from "@/lib/client/capture-profile-next-route-card";
import type {
  NextRoutePayload,
  NextRouteStop,
  NextRouteTransportMode,
  VisitedCity,
  VisitedCountry,
} from "@/types/database";

type ProfileNextRouteSectionProps = {
  initialStops?: NextRouteStop[];
  initialTotalDays?: number;
  initialTransport?: NextRouteTransportMode;
  isOwnProfile: boolean;
  displayName?: string;
  username?: string;
  avatarUrl?: string | null;
  visitedCountries?: VisitedCountry[];
  visitedCities?: VisitedCity[];
  sectionId?: string;
};

function isRouteStopVisited(
  stop: NextRouteStop,
  visitedCountries: VisitedCountry[],
  visitedCities: VisitedCity[],
  extraVisitedKeys: Set<string>
): boolean {
  const key = stopDedupeKey(stop);
  if (extraVisitedKeys.has(key)) return true;

  const code = stop.countryCode?.toUpperCase();
  if (!code) return false;

  if (stop.kind === "city") {
    const cityKey = canonicalCityKey(code, stop.name);
    return visitedCities.some(
      (city) =>
        city.country_code.toUpperCase() === code &&
        canonicalCityKey(city.country_code, city.city_name) === cityKey
    );
  }

  if (visitedCities.some((city) => city.country_code.toUpperCase() === code)) {
    return true;
  }

  return visitedCountries.some((country) => country.country_code.toUpperCase() === code);
}

function resolveInitialRoute(
  initialStops: NextRouteStop[] | undefined,
  initialTotalDays: number | undefined,
  initialTransport: NextRouteTransportMode | undefined,
  isOwnProfile: boolean
): { route: NextRoutePayload; fromCache: boolean } {
  const fallbackRoute: NextRoutePayload = {
    stops: initialStops ?? [],
    ...(initialTotalDays !== undefined ? { totalDays: initialTotalDays } : {}),
    ...(initialTransport !== undefined ? { transport: initialTransport } : {}),
  };

  if (!isOwnProfile) {
    return { route: fallbackRoute, fromCache: false };
  }

  const cached = readOwnNextRouteCache();
  if (cached !== null) {
    return { route: cached, fromCache: true };
  }
  if (fallbackRoute.stops.length > 0) {
    return { route: fallbackRoute, fromCache: false };
  }
  return { route: { stops: [] }, fromCache: false };
}

function mergeIncomingRoute(
  current: NextRoutePayload,
  incoming: NextRoutePayload
): NextRoutePayload {
  if (incoming.stops.length === 0 && current.stops.length > 0) {
    return current;
  }
  if (areNextRoutePayloadsEqual(current, incoming)) {
    return current;
  }
  return incoming;
}

export function ProfileNextRouteSection({
  initialStops = [],
  initialTotalDays,
  initialTransport,
  isOwnProfile,
  displayName,
  username,
  avatarUrl = null,
  visitedCountries = [],
  visitedCities = [],
  sectionId = "profile-next-route",
}: ProfileNextRouteSectionProps) {
  const { profile: profileMessages, nextRoute: nextRouteMessages } = useAppMessages();
  const modal = useModal();
  const toast = useToast();
  const locale = useLocale() === "tr" ? "tr" : "en";
  const initialResolved = useMemo(
    () => resolveInitialRoute(initialStops, initialTotalDays, initialTransport, isOwnProfile),
    [initialStops, initialTotalDays, initialTransport, isOwnProfile]
  );
  const { openNextRouteModal } = useDashboardAdd();
  const { open: openNextRouteDestination } = useNextRouteDestination();
  const [route, setRoute] = useState<NextRoutePayload>(() => initialResolved.route);
  const routeRef = useRef(initialResolved.route);
  const [loadingOwnRoute, setLoadingOwnRoute] = useState(
    () => isOwnProfile && !initialResolved.fromCache && initialResolved.route.stops.length === 0
  );
  const [locallyVisitedKeys, setLocallyVisitedKeys] = useState<Set<string>>(() => new Set());
  const [downloadingRouteCard, setDownloadingRouteCard] = useState(false);

  const routeTitle = useMemo(() => {
    if (isOwnProfile) return profileMessages.nextRouteTitle;
    if (!displayName) return profileMessages.nextRouteTitle;
    const name = locale === "tr" ? turkishGenitiveName(displayName) : displayName;
    return formatMessage(profileMessages.visitorNextRouteTitle, { name });
  }, [displayName, isOwnProfile, locale, profileMessages.nextRouteTitle, profileMessages.visitorNextRouteTitle]);

  const applyRoute = useCallback(
    (incoming: NextRoutePayload, options?: { replace?: boolean }) => {
      const parsed = parseNextRoutePayload(incoming);
      const next = options?.replace ? parsed : mergeIncomingRoute(routeRef.current, parsed);
      routeRef.current = next;
      setRoute(next);
      if (isOwnProfile) {
        writeOwnNextRouteCache(next);
      }
    },
    [isOwnProfile]
  );

  const loadOwnRoute = useCallback(
    async (options?: { force?: boolean; showSkeleton?: boolean }) => {
      if (!isOwnProfile) return;

      const preferCache = !options?.force;
      if (preferCache) {
        const cached = readOwnNextRouteCache();
        if (cached !== null) {
          applyRoute(cached, { replace: true });
          setLoadingOwnRoute(false);
          return;
        }
      }

      if (options?.showSkeleton !== false) {
        setLoadingOwnRoute((current) => current || true);
      }

      try {
        const result = await fetchNextRoute({
          preferCache: false,
          force: true,
        });
        if (result.ok) {
          applyRoute(result.route, { replace: true });
        }
      } finally {
        setLoadingOwnRoute(false);
      }
    },
    [applyRoute, isOwnProfile]
  );

  useEffect(() => {
    const incoming: NextRoutePayload = {
      stops: initialStops,
      ...(initialTotalDays !== undefined ? { totalDays: initialTotalDays } : {}),
      ...(initialTransport !== undefined ? { transport: initialTransport } : {}),
    };
    const next = mergeIncomingRoute(routeRef.current, incoming);
    if (next === routeRef.current) {
      if (initialStops.length > 0) {
        setLoadingOwnRoute(false);
      }
      return;
    }
    routeRef.current = next;
    setRoute(next);
    if (initialStops.length > 0) {
      setLoadingOwnRoute(false);
    }
  }, [initialStops, initialTotalDays, initialTransport]);

  useEffect(() => {
    if (!isOwnProfile) return;
    void loadOwnRoute({ force: false, showSkeleton: true });
  }, [isOwnProfile, loadOwnRoute]);

  useEffect(() => {
    if (!isOwnProfile) return;

    function onProfileStale() {
      void loadOwnRoute({ force: true, showSkeleton: false });
    }

    function onRouteChanged(event: Event) {
      applyRoute(parseNextRoutePayload((event as CustomEvent<unknown>).detail), { replace: true });
      setLoadingOwnRoute(false);
    }

    window.addEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
    window.addEventListener(NEXT_ROUTE_CHANGED_EVENT, onRouteChanged);
    return () => {
      window.removeEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
      window.removeEventListener(NEXT_ROUTE_CHANGED_EVENT, onRouteChanged);
    };
  }, [applyRoute, isOwnProfile, loadOwnRoute]);

  const handleRemoveFromRoute = useCallback(
    (stop: NextRouteStop) => {
      const previousRoute = routeRef.current;
      const nextRoute: NextRoutePayload = {
        ...previousRoute,
        stops: previousRoute.stops.filter((entry) => entry.id !== stop.id),
      };

      applyRoute(nextRoute, { replace: true });
      persistNextRouteStops(nextRoute.stops, {
        previousRoute,
        onError: (message) => {
          toast.show(message || nextRouteMessages.saveFailed, 2500);
        },
      });
    },
    [applyRoute, nextRouteMessages.saveFailed, toast]
  );

  const handleRouteMetaChange = useCallback(
    (patch: { totalDays?: number | null; transport?: NextRouteTransportMode | null }) => {
      const previousRoute = routeRef.current;
      const nextRoute: NextRoutePayload = {
        ...previousRoute,
        stops: previousRoute.stops,
      };

      if ("totalDays" in patch) {
        if (patch.totalDays == null) delete nextRoute.totalDays;
        else nextRoute.totalDays = patch.totalDays;
      }
      if ("transport" in patch) {
        if (patch.transport == null) delete nextRoute.transport;
        else nextRoute.transport = patch.transport;
      }

      applyRoute(nextRoute, { replace: true });
      persistNextRoute(nextRoute, {
        previousRoute,
        onError: (message) => {
          toast.show(message || nextRouteMessages.saveFailed, 2500);
        },
      });
    },
    [applyRoute, nextRouteMessages.saveFailed, toast]
  );

  const handleMarkVisited = useCallback(
    (stop: NextRouteStop) => {
      const visited = isRouteStopVisited(
        stop,
        visitedCountries,
        visitedCities,
        locallyVisitedKeys
      );

      const previousRoute = routeRef.current;
      const previousStops = previousRoute.stops;
      const nextStops = previousStops.filter((entry) => entry.id !== stop.id);

      applyRoute({ ...previousRoute, stops: nextStops }, { replace: true });
      setLocallyVisitedKeys((prev) => new Set(prev).add(stopDedupeKey(stop)));

      persistMarkNextRouteStopVisited({
        stop,
        currentStops: previousStops,
        alreadyVisited: visited,
        onError: (message) => {
          toast.show(message || nextRouteMessages.markVisitedFailed, 2500);
        },
        onAdded: () => {
          toast.show(nextRouteMessages.markedVisitedToast, 1000);
        },
      });
    },
    [
      applyRoute,
      locallyVisitedKeys,
      nextRouteMessages.markVisitedFailed,
      nextRouteMessages.markedVisitedToast,
      toast,
      visitedCities,
      visitedCountries,
    ]
  );

  useEffect(() => {
    const hash = `#${sectionId}`;

    function scrollToSection() {
      if (window.location.hash !== hash) return;
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    const timer = window.setTimeout(scrollToSection, 100);
    window.addEventListener("hashchange", scrollToSection);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", scrollToSection);
    };
  }, [sectionId]);

  const totalDayOptions = useMemo(
    () => Array.from({ length: NEXT_ROUTE_MAX_TOTAL_DAYS + 1 }, (_, index) => index),
    []
  );

  const transportLabels = useMemo(
    () =>
      ({
        car: nextRouteMessages.transportCar,
        train: nextRouteMessages.transportTrain,
        bus: nextRouteMessages.transportBus,
        bicycle: nextRouteMessages.transportBicycle,
        walking: nextRouteMessages.transportWalking,
      }) satisfies Record<NextRouteTransportMode, string>,
    [
      nextRouteMessages.transportBicycle,
      nextRouteMessages.transportBus,
      nextRouteMessages.transportCar,
      nextRouteMessages.transportTrain,
      nextRouteMessages.transportWalking,
    ]
  );

  const { stops, totalDays, transport } = route;

  const handleDownloadRouteCard = useCallback(async () => {
    if (!username || downloadingRouteCard) return;

    setDownloadingRouteCard(true);
    try {
      await downloadProfileNextRouteCardPng(username);
    } catch {
      await modal.alert(nextRouteMessages.downloadShareCardFailed, { variant: "error" });
    } finally {
      setDownloadingRouteCard(false);
    }
  }, [downloadingRouteCard, modal, nextRouteMessages.downloadShareCardFailed, username]);

  const routeSummaryLabel = useMemo(() => {
    if (stops.length === 0) return null;

    const count = String(stops.length);
    const days = totalDays !== undefined ? String(totalDays) : null;
    const transportLabel = transport ? transportLabels[transport] : null;

    if (transportLabel && days !== null) {
      return nextRouteMessages.routeSummaryFull
        .replace("{transport}", transportLabel)
        .replace("{days}", days)
        .replace("{count}", count);
    }
    if (days !== null) {
      return nextRouteMessages.routeSummaryWithDays
        .replace("{days}", days)
        .replace("{count}", count);
    }
    if (transportLabel) {
      return nextRouteMessages.routeSummaryWithTransport
        .replace("{transport}", transportLabel)
        .replace("{count}", count);
    }
    return nextRouteMessages.routeSummaryStopsOnly.replace("{count}", count);
  }, [
    stops.length,
    totalDays,
    transport,
    transportLabels,
    nextRouteMessages.routeSummaryFull,
    nextRouteMessages.routeSummaryStopsOnly,
    nextRouteMessages.routeSummaryWithDays,
    nextRouteMessages.routeSummaryWithTransport,
  ]);

  if (stops.length === 0 && !isOwnProfile) return null;

  if (isOwnProfile && loadingOwnRoute && stops.length === 0) {
    return <ProfileNextRouteSectionSkeleton rows={4} />;
  }

  const showTripMeta = stops.length > 0 && isOwnProfile;

  return (
    <section id={sectionId} className="profile-section profile-next-route">
      <div
        id={`${sectionId}-capture`}
        className="profile-next-route-box"
        {...(stops.length > 0 ? { "data-route-capture-ready": true } : {})}
      >
        {displayName && username ? (
          <div className="profile-next-route-capture-author" aria-hidden="true">
            <ProfileAvatar
              avatarUrl={avatarUrl}
              displayName={displayName}
              username={username}
              size="sm"
              className="profile-next-route-capture-author__avatar"
            />
            <p className="profile-next-route-capture-author__name">{displayName}</p>
          </div>
        ) : null}
        <div className="profile-next-route-box__hero profile-card-hero">
          <div className="profile-next-route-box__header">
            {isOwnProfile && stops.length > 0 ? (
              <div
                className="profile-next-route-box__header-action profile-next-route-box__header-action--start"
                data-route-capture-exclude
              >
                <button
                  type="button"
                  className="profile-owner-section__btn profile-owner-section__btn--sort"
                  onClick={() => openNextRouteModal("route")}
                >
                  {profileMessages.sortRoute}
                </button>
              </div>
            ) : null}
            <div className="profile-next-route-box__intro">
              <h3 className="profile-next-route-box__title profile-card-hero__title">
                {routeTitle}
              </h3>
              {routeSummaryLabel ? (
                <p className="profile-next-route-box__count profile-card-hero__count">{routeSummaryLabel}</p>
              ) : null}
            </div>
            {isOwnProfile ? (
              <div
                className="profile-next-route-box__header-action profile-next-route-box__header-action--end"
                data-route-capture-exclude
              >
                <button
                  type="button"
                  className="profile-owner-section__btn profile-owner-section__btn--add"
                  onClick={() => {
                    openNextRouteDestination();
                  }}
                >
                  {profileMessages.ownerAdd}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {stops.length === 0 ? (
          <div className="profile-next-route-box__body profile-next-route-box__body--empty">
            <p className="profile-owner-empty">{profileMessages.nextRouteEmptyOnProfile}</p>
          </div>
        ) : (
          <>
            {showTripMeta ? (
              <div className="profile-next-route-box__trip-meta" data-route-capture-exclude>
                <select
                  className="profile-next-route-select"
                  value={transport ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    handleRouteMetaChange({
                      transport: value ? (value as NextRouteTransportMode) : null,
                    });
                  }}
                  aria-label={nextRouteMessages.transportLabel}
                >
                  <option value="">{nextRouteMessages.transportLabel}</option>
                  {NEXT_ROUTE_TRANSPORT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {transportLabels[mode]}
                    </option>
                  ))}
                </select>
                <select
                  className="profile-next-route-select"
                  value={totalDays ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    handleRouteMetaChange({
                      totalDays: value === "" ? null : Number(value),
                    });
                  }}
                  aria-label={nextRouteMessages.totalDaysLabel}
                >
                  <option value="">{nextRouteMessages.totalDaysLabel}</option>
                  {totalDayOptions.map((day) => (
                    <option key={day} value={day}>
                      {nextRouteMessages.totalDaysOption.replace("{count}", String(day))}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="profile-next-route-box__body">
              <ol className="profile-next-route-timeline">
                {stops.map((stop, index) => {
                  const { title, subtitle, countryCode } = getNextRouteStopDisplay(stop, locale);
                  const flagUrl = countryCode ? countryCodeToFlagUrl(countryCode) : "";
                  const visited = isRouteStopVisited(
                    stop,
                    visitedCountries,
                    visitedCities,
                    locallyVisitedKeys
                  );

                  return (
                    <li key={stop.id} className="profile-next-route-timeline-item">
                      <div className="profile-next-route-card">
                        <div className="profile-next-route-card__main">
                          <span className="profile-next-route-node" aria-hidden>
                            {index + 1}
                          </span>
                          {flagUrl ? (
                            <span className="profile-next-route-flag">
                              <Image
                                src={flagUrl}
                                alt=""
                                width={32}
                                height={32}
                                className="rounded-full object-cover"
                              />
                            </span>
                          ) : null}
                          <span className="profile-next-route-text">
                            {stop.href ? (
                              <Link
                                href={stop.href}
                                className="profile-next-route-name profile-next-route-link"
                                prefetch={false}
                              >
                                {title}
                              </Link>
                            ) : (
                              <span className="profile-next-route-name">{title}</span>
                            )}
                            {subtitle ? (
                              <span className="profile-next-route-meta" title={subtitle}>
                                {subtitle}
                              </span>
                            ) : null}
                          </span>
                          {isOwnProfile ? (
                            <div className="profile-next-route-actions" data-route-capture-exclude>
                              <button
                                type="button"
                                className="profile-next-route-action-btn profile-next-route-action-btn--remove"
                                onClick={() => handleRemoveFromRoute(stop)}
                                aria-label={nextRouteMessages.removeStop}
                                title={nextRouteMessages.removeStop}
                              >
                                −
                              </button>
                              <button
                                type="button"
                                className={`profile-next-route-action-btn profile-next-route-action-btn--ok${
                                  visited ? " profile-next-route-action-btn--ok-on" : ""
                                }`}
                                onClick={() => handleMarkVisited(stop)}
                                aria-label={
                                  visited
                                    ? nextRouteMessages.markVisitedDone
                                    : nextRouteMessages.markVisited
                                }
                                title={
                                  visited
                                    ? nextRouteMessages.markVisitedDone
                                    : nextRouteMessages.markVisited
                                }
                              >
                                ✓
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
            {isOwnProfile && username ? (
              <div className="profile-next-route-box__download" data-route-capture-exclude>
                <button
                  type="button"
                  className="profile-next-route-download-btn"
                  disabled={downloadingRouteCard}
                  onClick={() => void handleDownloadRouteCard()}
                >
                  {downloadingRouteCard
                    ? nextRouteMessages.downloadShareCardBusy
                    : nextRouteMessages.downloadShareCard}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
