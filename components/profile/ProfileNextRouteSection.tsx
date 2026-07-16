"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboardAdd } from "@/components/dashboard/DashboardAddProvider";
import { useNextRouteDestination } from "@/components/add/NextRouteDestinationProvider";
import { ProfileNextRouteSectionSkeleton } from "@/components/skeletons/ProfileNextRouteSectionSkeleton";
import {
  NEXT_ROUTE_CHANGED_EVENT,
  PROFILE_DATA_STALE_EVENT,
  readOwnNextRouteCache,
  writeOwnNextRouteCache,
} from "@/lib/client/session-page-cache";
import { fetchNextRoute } from "@/lib/client/next-route-state";
import { nextRouteMessages, profileMessages } from "@/lib/i18n/client-messages";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import {
  areNextRouteStopsEqual,
  getNextRouteStopDisplay,
  parseNextRoute,
} from "@/lib/utils/next-route";
import type { NextRouteStop } from "@/types/database";

type ProfileNextRouteSectionProps = {
  initialStops?: NextRouteStop[];
  isOwnProfile: boolean;
};

function resolveInitialStops(
  initialStops: NextRouteStop[] | undefined,
  isOwnProfile: boolean
): { stops: NextRouteStop[]; fromCache: boolean } {
  const safeInitialStops = initialStops ?? [];

  if (!isOwnProfile) {
    return { stops: safeInitialStops, fromCache: false };
  }

  const cached = readOwnNextRouteCache();
  // null = miss; [] = valid empty hit
  if (cached !== null) {
    return { stops: cached, fromCache: true };
  }
  if (safeInitialStops.length > 0) {
    return { stops: safeInitialStops, fromCache: false };
  }
  return { stops: [], fromCache: false };
}

function mergeIncomingStops(
  current: NextRouteStop[] | undefined,
  incoming: NextRouteStop[] | undefined
): NextRouteStop[] {
  const safeCurrent = current ?? [];
  const safeIncoming = incoming ?? [];

  if (safeIncoming.length === 0) {
    return safeCurrent.length > 0 ? safeCurrent : safeIncoming;
  }
  if (areNextRouteStopsEqual(safeCurrent, safeIncoming)) {
    return safeCurrent;
  }
  return safeIncoming;
}

export function ProfileNextRouteSection({
  initialStops = [],
  isOwnProfile,
}: ProfileNextRouteSectionProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const initialResolved = useMemo(
    () => resolveInitialStops(initialStops, isOwnProfile),
    [initialStops, isOwnProfile]
  );
  const { openNextRouteModal } = useDashboardAdd();
  const { open: openNextRouteDestination } = useNextRouteDestination();
  const [stops, setStops] = useState(() => initialResolved.stops);
  const [loadingOwnRoute, setLoadingOwnRoute] = useState(
    () => isOwnProfile && !initialResolved.fromCache && initialResolved.stops.length === 0
  );

  const applyStops = useCallback((incoming: NextRouteStop[], options?: { replace?: boolean }) => {
    const parsed = parseNextRoute(incoming);
    setStops((current) => {
      const next = options?.replace ? parsed : mergeIncomingStops(current, parsed);
      if (isOwnProfile) {
        writeOwnNextRouteCache(next);
      }
      return next;
    });
  }, [isOwnProfile]);

  const loadOwnRoute = useCallback(async (options?: { force?: boolean; showSkeleton?: boolean }) => {
    if (!isOwnProfile) return;

    const preferCache = !options?.force;
    if (preferCache) {
      const cached = readOwnNextRouteCache();
      if (cached !== null) {
        applyStops(cached, { replace: true });
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
        applyStops(result.stops, { replace: true });
      }
    } finally {
      setLoadingOwnRoute(false);
    }
  }, [applyStops, isOwnProfile]);

  useEffect(() => {
    setStops((current) => mergeIncomingStops(current, initialStops));
    if (initialStops.length > 0) {
      setLoadingOwnRoute(false);
    }
  }, [initialStops]);

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
      const detail = (event as CustomEvent<{ stops?: unknown }>).detail;
      applyStops(parseNextRoute(detail?.stops), { replace: true });
      setLoadingOwnRoute(false);
    }

    window.addEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
    window.addEventListener(NEXT_ROUTE_CHANGED_EVENT, onRouteChanged);
    return () => {
      window.removeEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
      window.removeEventListener(NEXT_ROUTE_CHANGED_EVENT, onRouteChanged);
    };
  }, [applyStops, isOwnProfile, loadOwnRoute]);

  useEffect(() => {
    function scrollToSection() {
      if (window.location.hash !== "#profile-next-route") return;
      document.getElementById("profile-next-route")?.scrollIntoView({
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
  }, []);

  if (stops.length === 0 && !isOwnProfile) return null;

  if (isOwnProfile && loadingOwnRoute && stops.length === 0) {
    return <ProfileNextRouteSectionSkeleton rows={3} />;
  }

  const stopCountLabel =
    stops.length > 0
      ? nextRouteMessages.routeStopCount.replace("{count}", String(stops.length))
      : null;

  return (
    <section id="profile-next-route" className="profile-section profile-next-route">
      <div className="profile-owner-section profile-next-route-box">
        <div className="profile-owner-section__header profile-next-route-box__header">
          <div className="profile-next-route-box__header-side">
            {isOwnProfile ? (
              stops.length > 0 ? (
                <button
                  type="button"
                  className="profile-owner-section__btn"
                  onClick={() => openNextRouteModal("route")}
                >
                  {profileMessages.sortRoute}
                </button>
              ) : (
                <span className="profile-next-route-box__header-spacer" aria-hidden />
              )
            ) : null}
          </div>
          <div className="profile-owner-section__intro profile-next-route-box__intro">
            <h3 className="profile-owner-section__title">{profileMessages.nextRouteTitle}</h3>
            {stopCountLabel ? (
              <p className="profile-owner-section__count">{stopCountLabel}</p>
            ) : null}
          </div>
          <div className="profile-next-route-box__header-side profile-next-route-box__header-side--end">
            {isOwnProfile ? (
              <button
                type="button"
                className="profile-owner-section__btn profile-owner-section__btn--add"
                onClick={() => {
                  openNextRouteDestination();
                  router.push(`/c/next?next=${encodeURIComponent(pathname)}`);
                }}
              >
                {profileMessages.ownerAdd}
              </button>
            ) : null}
          </div>
        </div>

        {stops.length === 0 ? (
          <p className="profile-owner-empty">{profileMessages.nextRouteEmptyOnProfile}</p>
        ) : (
          <ul className="profile-next-route-list">
            {stops.map((stop, index) => {
              const { title, subtitle, countryCode } = getNextRouteStopDisplay(stop);
              const flagUrl = countryCode ? countryCodeToFlagUrl(countryCode) : "";

              return (
                <li key={stop.id} className="profile-next-route-item">
                  <div className="profile-next-route-row">
                    <span className="profile-next-route-index" aria-hidden>
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
                        <Link href={stop.href} className="profile-next-route-name profile-next-route-link">
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
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
