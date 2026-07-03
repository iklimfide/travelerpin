"use client";

import { PROFILE_OG_CAPTURE_ID } from "@/lib/client/capture-profile-og-card";
import { WORLD_COUNTRY_TOTAL, worldCoveragePercent } from "@/lib/utils/profile-page";
import type { TravelStats } from "@/types/database";

type ProfileOgCaptureHostProps = {
  heroTitle: string;
  description: string;
  avatarUrl: string | null;
  displayName: string;
  username: string;
  stats: TravelStats;
  badgeLabel: string | null;
  badgeShellClassName: string;
  worldExploredLabel: string;
  worldExploredCaption: string;
  statLabels: {
    countries: string;
    cities: string;
    nationalParks: string;
    themeParks: string;
  };
};

function profileInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

function OgStatItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="profile-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function ProfileOgCaptureHost({
  heroTitle,
  description,
  avatarUrl,
  displayName,
  username,
  stats,
  badgeLabel,
  badgeShellClassName,
  worldExploredLabel,
  worldExploredCaption,
  statLabels,
}: ProfileOgCaptureHostProps) {
  const coverage = worldCoveragePercent(stats.countries);

  return (
    <div id={PROFILE_OG_CAPTURE_ID} className="profile-og-capture" aria-hidden>
      <h2 className="profile-og-capture__title">{heroTitle}</h2>
      <p className="profile-og-capture__desc">{description}</p>

      <div className="profile-og-capture__row">
        <div className="profile-og-capture__avatar-col">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              width={112}
              height={112}
              className="profile-og-capture__avatar"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="profile-og-capture__avatar profile-og-capture__avatar--fallback">
              {profileInitial(displayName || username)}
            </div>
          )}
          {badgeLabel ? (
            <span className={`profile-og-capture__badge ${badgeShellClassName}`}>{badgeLabel}</span>
          ) : null}
        </div>

        <div className="profile-og-capture__metrics">
          <div className="profile-world-progress profile-og-capture__panel">
            <div className="profile-world-progress__top">
              <strong>
                <span aria-hidden>🌍</span> {worldExploredLabel}
              </strong>
              <span className="profile-world-progress__percent">{coverage}%</span>
            </div>
            <div className="profile-world-progress__bar" aria-hidden>
              <div className="profile-world-progress__fill" style={{ width: `${coverage}%` }} />
            </div>
            <p className="profile-world-progress__caption">{worldExploredCaption}</p>
          </div>

          <div className="profile-stats profile-og-capture__panel">
            <OgStatItem value={stats.countries} label={statLabels.countries} />
            <OgStatItem value={stats.cities} label={statLabels.cities} />
            <OgStatItem value={stats.nationalParks} label={statLabels.nationalParks} />
            <OgStatItem value={stats.themeParks} label={statLabels.themeParks} />
          </div>
        </div>
      </div>
    </div>
  );
}
