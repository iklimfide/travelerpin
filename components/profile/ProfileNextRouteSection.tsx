"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDashboardAdd } from "@/components/dashboard/DashboardAddProvider";
import {
  NEXT_ROUTE_CHANGED_EVENT,
  PROFILE_DATA_STALE_EVENT,
  notifyNextRouteChanged,
  readOwnNextRouteCache,
  writeOwnNextRouteCache,
} from "@/lib/client/session-page-cache";
import { nextRouteMessages, profileMessages } from "@/lib/i18n/client-messages";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import {
  areNextRouteStopsEqual,
  getNextRouteStopDisplay,
  parseNextRoute,
} from "@/lib/utils/next-route";
import type { NextRouteStop } from "@/types/database";

type ProfileNextRouteSectionProps = {
  initialStops: NextRouteStop[];
  isOwnProfile: boolean;
};

function resolveInitialStops(initialStops: NextRouteStop[], isOwnProfile: boolean): NextRouteStop[] {
  if (!isOwnProfile) return initialStops;

  const cached = readOwnNextRouteCache();
  if (cached && cached.length > 0) return cached;
  if (initialStops.length > 0) return initialStops;
  return [];
}

function mergeIncomingStops(current: NextRouteStop[], incoming: NextRouteStop[]): NextRouteStop[] {
  if (incoming.length === 0) {
    return current.length > 0 ? current : incoming;
  }
  if (areNextRouteStopsEqual(current, incoming)) {
    return current;
  }
  return incoming;
}

export function ProfileNextRouteSection({
  initialStops,
  isOwnProfile,
}: ProfileNextRouteSectionProps) {
  const { openNextRouteModal } = useDashboardAdd();
  const [stops, setStops] = useState(() => resolveInitialStops(initialStops, isOwnProfile));
  const [reorderBusy, setReorderBusy] = useState(false);

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

  const loadOwnRoute = useCallback(async () => {
    if (!isOwnProfile) return;
    try {
      const res = await fetch("/api/me/next-route");
      if (!res.ok) return;
      const data = (await res.json()) as { stops?: unknown };
      applyStops(parseNextRoute(data.stops));
    } catch {
      // Keep the last known route on transient failures.
    }
  }, [applyStops, isOwnProfile]);

  useEffect(() => {
    setStops((current) => mergeIncomingStops(current, initialStops));
  }, [initialStops]);

  useEffect(() => {
    if (!isOwnProfile) return;
    void loadOwnRoute();
  }, [isOwnProfile, loadOwnRoute]);

  useEffect(() => {
    if (!isOwnProfile) return;

    function onProfileStale() {
      void loadOwnRoute();
    }

    function onRouteChanged(event: Event) {
      const detail = (event as CustomEvent<{ stops?: unknown }>).detail;
      applyStops(parseNextRoute(detail?.stops), { replace: true });
    }

    window.addEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
    window.addEventListener(NEXT_ROUTE_CHANGED_EVENT, onRouteChanged);
    return () => {
      window.removeEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
      window.removeEventListener(NEXT_ROUTE_CHANGED_EVENT, onRouteChanged);
    };
  }, [applyStops, isOwnProfile, loadOwnRoute]);

  const persistStops = useCallback(
    async (nextStops: NextRouteStop[]) => {
      setReorderBusy(true);
      applyStops(nextStops, { replace: true });
      try {
        const res = await fetch("/api/me/next-route", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stops: nextStops }),
        });
        if (!res.ok) {
          void loadOwnRoute();
          return;
        }
        const data = (await res.json()) as { stops?: unknown };
        notifyNextRouteChanged(parseNextRoute(data.stops));
      } catch {
        void loadOwnRoute();
      } finally {
        setReorderBusy(false);
      }
    },
    [applyStops, loadOwnRoute]
  );

  const moveStop = useCallback(
    (index: number, direction: -1 | 1) => {
      if (reorderBusy) return;
      setStops((prev) => {
        const target = index + direction;
        if (target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        const [item] = next.splice(index, 1);
        next.splice(target, 0, item!);
        void persistStops(next);
        return next;
      });
    },
    [persistStops, reorderBusy]
  );

  if (stops.length === 0 && !isOwnProfile) return null;

  const stopCountLabel =
    stops.length > 0
      ? nextRouteMessages.routeStopCount.replace("{count}", String(stops.length))
      : null;

  return (
    <section className="profile-section profile-next-route">
      <div className="profile-owner-section profile-next-route-box">
        <div className="profile-owner-section__header">
          <div className="profile-owner-section__intro">
            <h3 className="profile-owner-section__title">{profileMessages.nextRouteTitle}</h3>
            {stopCountLabel ? (
              <p className="profile-owner-section__count">{stopCountLabel}</p>
            ) : null}
          </div>
          {isOwnProfile ? (
            <div className="profile-owner-section__actions">
              <button
                type="button"
                className="profile-owner-section__btn profile-owner-section__btn--add"
                onClick={openNextRouteModal}
              >
                {profileMessages.ownerAdd}
              </button>
            </div>
          ) : null}
        </div>

        {stops.length === 0 ? (
          <p className="profile-owner-empty">{profileMessages.nextRouteEmptyOnProfile}</p>
        ) : (
          <ul className="profile-next-route-list">
            {stops.map((stop, index) => {
              const { title, subtitle, countryCode } = getNextRouteStopDisplay(stop);
              const flagUrl = countryCode ? countryCodeToFlagUrl(countryCode) : "";
              const canReorder = isOwnProfile && stops.length > 1;

              return (
                <li key={stop.id} className="profile-next-route-item">
                  <div className="profile-next-route-row">
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
                  {canReorder ? (
                    <div className="profile-next-route-actions">
                      <button
                        type="button"
                        className="profile-next-route-sort-btn"
                        onClick={() => moveStop(index, -1)}
                        disabled={index === 0 || reorderBusy}
                        aria-label={nextRouteMessages.moveUp}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="profile-next-route-sort-btn"
                        onClick={() => moveStop(index, 1)}
                        disabled={index === stops.length - 1 || reorderBusy}
                        aria-label={nextRouteMessages.moveDown}
                      >
                        ↓
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
