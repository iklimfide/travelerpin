"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDashboardAdd } from "@/components/dashboard/DashboardAddProvider";
import { PROFILE_DATA_STALE_EVENT } from "@/lib/client/session-page-cache";
import { nextRouteMessages, profileMessages } from "@/lib/i18n/client-messages";
import { parseNextRoute } from "@/lib/utils/next-route";
import type { NextRouteStop } from "@/types/database";

type ProfileNextRouteSectionProps = {
  initialStops: NextRouteStop[];
  isOwnProfile: boolean;
};

export function ProfileNextRouteSection({
  initialStops,
  isOwnProfile,
}: ProfileNextRouteSectionProps) {
  const { openNextRouteModal } = useDashboardAdd();
  const [stops, setStops] = useState(initialStops);

  const loadOwnRoute = useCallback(async () => {
    if (!isOwnProfile) return;
    try {
      const res = await fetch("/api/me/next-route");
      if (!res.ok) return;
      const data = (await res.json()) as { stops?: unknown };
      const parsed = parseNextRoute(data.stops);
      setStops((current) => {
        if (parsed.length === 0 && current.length > 0) return current;
        return parsed;
      });
    } catch {
      // Keep the last known route on transient failures.
    }
  }, [isOwnProfile]);

  useEffect(() => {
    setStops(initialStops);
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

    window.addEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
    return () => window.removeEventListener(PROFILE_DATA_STALE_EVENT, onProfileStale);
  }, [isOwnProfile, loadOwnRoute]);

  if (stops.length === 0 && !isOwnProfile) return null;

  return (
    <section className="profile-section profile-next-route">
      <div className="profile-section-head">
        <h2 className="profile-section-title">{profileMessages.nextRouteTitle}</h2>
      </div>

      {stops.length === 0 ? (
        <div className="profile-next-route-empty">
          <p>{profileMessages.nextRouteEmptyOnProfile}</p>
          <button type="button" className="profile-next-route-add" onClick={openNextRouteModal}>
            {nextRouteMessages.title}
          </button>
        </div>
      ) : (
        <ul className="profile-next-route-list">
          {stops.map((stop) => (
            <li key={stop.id} className="profile-next-route-item">
              {stop.href ? (
                <Link href={stop.href} className="profile-next-route-link">
                  {stop.name}
                </Link>
              ) : (
                <span className="profile-next-route-label">{stop.name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
