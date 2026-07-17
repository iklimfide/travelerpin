"use client";

import { Link } from "@/lib/i18n/navigation";
import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { ShareSheetModal } from "@/components/share/ShareSheetModal";
import { ShareTravelUpdateModal } from "@/components/share/ShareTravelUpdateModal";
import { useShareProfile } from "@/components/share/ShareProfileButton";
import { finalizeTravelShare } from "@/lib/client/travel-share-snapshot";
import { useAppMessages } from "@/lib/i18n/client-messages";
import { profileAllPath } from "@/lib/seo/site";
import { countryCodeToFlagUrl } from "@/lib/utils/country-flag";
import type { TravelUpdateDelta } from "@/lib/utils/travel-update";
import type { TravelStats } from "@/types/database";

type ProfileTravelUpdateCardProps = {
  username: string;
  displayName: string;
  stats: TravelStats;
  delta: TravelUpdateDelta;
  isOwnProfile?: boolean;
  persistShareSnapshot?: boolean;
};

type StatKind = "countries" | "cities" | "nationalParks" | "themeParks";

function StatIcon({ kind }: { kind: StatKind }) {
  const { profile: profileMessages } = useAppMessages();
  const props = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (kind) {
    case "countries":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    case "cities":
      return (
        <svg {...props}>
          <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
          <circle cx="12" cy="11" r="2.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "nationalParks":
      return (
        <svg {...props}>
          <path d="M4 18 9 8l4 7 3-5 4 8H4Z" />
        </svg>
      );
    case "themeParks":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12h8M12 8v8" />
        </svg>
      );
  }
}

function ProfileUpdateStat({
  icon,
  value,
  label,
  href,
}: {
  icon: StatKind;
  value: ReactNode;
  label: string;
  href: string;
}) {
  const { profile: profileMessages } = useAppMessages();
  return (
    <Link href={href} className="profile-update-card__stat profile-update-card__stat-link">
      <span className="profile-update-card__stat-icon">
        <StatIcon kind={icon} />
      </span>
      <strong>{value}</strong>
      <span>{label}</span>
    </Link>
  );
}

export function ProfileTravelUpdateCard({
  username,
  displayName,
  stats,
  delta,
  isOwnProfile = true,
  persistShareSnapshot = true,
}: ProfileTravelUpdateCardProps) {
  const { profile: profileMessages } = useAppMessages();
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const hasUpdate = delta.hasChanges;
  const allHref = profileAllPath(username);

  const handleShareComplete = useCallback(async () => {
    if (!persistShareSnapshot) return;
    await finalizeTravelShare(() => router.refresh(), username);
  }, [persistShareSnapshot, router, username]);

  const { open, setOpen, shareLinks, handleCopy } = useShareProfile({
    username,
    displayName,
    stats,
    isOwnProfile,
    onShareComplete: handleShareComplete,
  });

  const showParksDelta = delta.parksDelta > 0;

  return (
    <>
      <section className="profile-section">
        <div className="profile-update-card">
          <h3 className="profile-update-card__title">
            {hasUpdate ? `✨ ${profileMessages.travelUpdateTitle}` : profileMessages.travelUpdateShareTitle}
          </h3>
          <p className="profile-update-card__subtitle">
            {hasUpdate
              ? profileMessages.travelUpdateSubtitle
              : profileMessages.travelUpdateShareSubtitle}
          </p>

          {hasUpdate ? (
            <>
              <div className="profile-update-card__stats">
                {delta.countriesDelta > 0 ? (
                  <ProfileUpdateStat
                    icon="countries"
                    value={`+${delta.countriesDelta}`}
                    label={profileMessages.travelUpdateCountries}
                    href={allHref}
                  />
                ) : null}
                {delta.citiesDelta > 0 ? (
                  <ProfileUpdateStat
                    icon="cities"
                    value={`+${delta.citiesDelta}`}
                    label={profileMessages.travelUpdateCities}
                    href={allHref}
                  />
                ) : null}
                {showParksDelta ? (
                  <ProfileUpdateStat
                    icon="nationalParks"
                    value={`+${delta.parksDelta}`}
                    label={profileMessages.travelUpdateParks}
                    href={allHref}
                  />
                ) : null}
              </div>

              {delta.newCountries.length > 0 ? (
                <div className="profile-update-card__flags">
                  <span className="profile-update-card__flags-label">
                    {profileMessages.travelUpdateNewCountries}
                  </span>
                  {delta.newCountries.slice(0, 6).map((country) => (
                    <span key={country.code} className="profile-update-card__flag">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={countryCodeToFlagUrl(country.code)}
                        alt=""
                        width={18}
                        height={14}
                        className="h-[14px] w-[18px] rounded-sm object-cover"
                      />
                      {country.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="profile-update-card__stats profile-update-card__stats--totals">
              <ProfileUpdateStat
                icon="countries"
                value={stats.countries}
                label={profileMessages.travelUpdateCountries}
                href={allHref}
              />
              <ProfileUpdateStat
                icon="cities"
                value={stats.cities}
                label={profileMessages.travelUpdateCities}
                href={allHref}
              />
              <ProfileUpdateStat
                icon="nationalParks"
                value={stats.nationalParks}
                label={profileMessages.travelUpdateNationalParks}
                href={allHref}
              />
              <ProfileUpdateStat
                icon="themeParks"
                value={stats.themeParks}
                label={profileMessages.travelUpdateThemeParks}
                href={allHref}
              />
            </div>
          )}

          <div className="profile-update-card__actions">
            <button
              type="button"
              className="profile-update-card__btn profile-update-card__btn--white"
              onClick={() => setUpdateOpen(true)}
            >
              {hasUpdate
                ? profileMessages.shareTravelUpdate
                : profileMessages.travelUpdateDownloadCard}
            </button>
            <button
              type="button"
              className="profile-update-card__btn profile-update-card__btn--ghost"
              onClick={() => setOpen(true)}
            >
              {profileMessages.shareCurrentMap}
            </button>
          </div>
        </div>
      </section>

      <ShareTravelUpdateModal
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        username={username}
        displayName={displayName}
        delta={delta}
        persistShareSnapshot={persistShareSnapshot}
      />

      <ShareSheetModal
        open={open}
        onClose={() => setOpen(false)}
        onCopy={handleCopy}
        onShareComplete={handleShareComplete}
        shareLinks={shareLinks}
      />
    </>
  );
}
