"use client";

import { useState } from "react";
import { Link } from "@/lib/i18n/navigation";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileAvatarLightbox } from "@/components/profile/ProfileAvatarLightbox";
import { ProfileActionButtons } from "@/components/profile/ProfileActionButtons";
import { ProfileInstagramLink } from "@/components/profile/ProfileInstagramLink";
import { ProfileStatCounters } from "@/components/profile/ProfileStatCounters";
import { ProfileWorldProgress } from "@/components/profile/ProfileWorldProgress";
import { TravelerBadge } from "@/components/profile/TravelerBadge";
import { useTranslateProfile } from "@/lib/i18n/client-messages";
import { resolvePublicMediaImageUrl } from "@/lib/storage/hub-photo-url";
import { profileAllPath } from "@/lib/seo/site";
import type { TravelStats } from "@/types/database";

type ProfileIdentityCardProps = {
  avatarUrl: string | null;
  displayName: string;
  username: string;
  bio: string | null;
  residence?: string | null;
  residenceHref?: string | null;
  instagramUrl?: string | null;
  /** Demo/sample profiles: show this toast instead of opening Instagram. */
  instagramSampleNotice?: string | null;
  stats: TravelStats;
  isOwnProfile: boolean;
  countryCount: number;
  labels: {
    countries: string;
    cities: string;
    nationalParks: string;
    themeParks: string;
  };
  profileHref?: string;
  followUsername?: string;
  followState?: {
    isFollowing: boolean;
    followerCount: number;
    followingCount: number;
  } | null;
  canFollow?: boolean;
  isLoggedIn?: boolean;
};

export function ProfileIdentityCard({
  avatarUrl,
  displayName,
  username,
  bio,
  residence = null,
  residenceHref = null,
  instagramUrl,
  instagramSampleNotice,
  stats,
  isOwnProfile,
  countryCount,
  labels,
  profileHref,
  followUsername,
  followState,
  canFollow = false,
  isLoggedIn = false,
}: ProfileIdentityCardProps) {
  const t = useTranslateProfile();
  const allHref = profileAllPath(username);
  const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false);
  const avatarImageSrc = resolvePublicMediaImageUrl(avatarUrl) ?? avatarUrl;
  const canExpandAvatar = Boolean(avatarImageSrc);
  const residenceLabel = residence?.trim() || null;

  const avatarNode = (
    <ProfileAvatar
      avatarUrl={avatarUrl}
      displayName={displayName}
      username={username}
      size="lg"
      className="profile-avatar !h-28 !w-28 !rounded-[32px] !text-[38px] !ring-8 !ring-[#eef3f9]"
    />
  );

  const residencePill = residenceLabel ? (
    <>
      <span aria-hidden>📍</span>
      <span>{residenceLabel}</span>
    </>
  ) : null;

  return (
    <section className="profile-card">
      <ProfileActionButtons
        username={username}
        displayName={displayName}
        isOwnProfile={isOwnProfile}
        followUsername={followUsername}
        followState={followState}
        canFollow={canFollow}
        isLoggedIn={isLoggedIn}
      />

      <div className="profile-avatar-shell">
        {canExpandAvatar ? (
          <button
            type="button"
            className="profile-avatar-button"
            aria-label={t("viewProfilePhoto")}
            onClick={() => setAvatarLightboxOpen((open) => !open)}
          >
            {avatarNode}
          </button>
        ) : profileHref ? (
          <Link href={profileHref} className="profile-avatar-link" aria-label={`${displayName}'s profile`}>
            {avatarNode}
          </Link>
        ) : (
          avatarNode
        )}
      </div>

      {residencePill ? (
        residenceHref ? (
          <Link
            href={residenceHref}
            className="profile-city-pill profile-city-pill--link absolute top-[14px] right-[14px] z-[1] max-w-[min(40%,10rem)] rounded-2xl !bg-[#e8eef5] !px-2.5 !py-1.5 !text-[0.7rem] !font-semibold !leading-[1.2] !text-[#64748b] shadow-sm !backdrop-blur-none hover:!bg-[#dce5f0] hover:!text-[#2563eb] sm:max-w-[12rem]"
            title={residenceLabel ?? undefined}
          >
            {residencePill}
          </Link>
        ) : (
          <div
            className="profile-city-pill absolute top-[14px] right-[14px] z-[1] max-w-[min(40%,10rem)] rounded-2xl !bg-[#e8eef5] !px-2.5 !py-1.5 !text-[0.7rem] !font-semibold !leading-[1.2] !text-[#64748b] shadow-sm !backdrop-blur-none sm:max-w-[12rem]"
            title={residenceLabel ?? undefined}
          >
            {residencePill}
          </div>
        )
      ) : null}

      {avatarLightboxOpen && avatarImageSrc ? (
        <ProfileAvatarLightbox
          src={avatarImageSrc}
          alt={displayName}
          closeLabel={t("closePin")}
          onClose={() => setAvatarLightboxOpen(false)}
        />
      ) : null}

      {profileHref ? (
        <h2 className="profile-name">
          <Link href={profileHref} className="profile-name-link">
            {displayName}
          </Link>
        </h2>
      ) : (
        <h2 className="profile-name">{displayName}</h2>
      )}

      <div className="mt-2 flex justify-center">
        <TravelerBadge countryCount={countryCount} className="traveler-badge--profile-card" />
      </div>

      {instagramUrl ? (
        <ProfileInstagramLink url={instagramUrl} sampleNotice={instagramSampleNotice} />
      ) : (
        <span className="profile-instagram-spacer" aria-hidden="true" />
      )}

      {bio?.trim() ? <p className="profile-desc">{bio.trim()}</p> : null}

      <Link
        href={allHref}
        className="profile-metrics profile-metrics-link"
        aria-label={t("allDestinationsTitle", { name: displayName })}
      >
        <ProfileWorldProgress countryCount={countryCount} />

        <ProfileStatCounters
          countries={stats.countries}
          cities={stats.cities}
          nationalParks={stats.nationalParks}
          themeParks={stats.themeParks}
          countriesLabel={labels.countries}
          citiesLabel={labels.cities}
          nationalParksLabel={labels.nationalParks}
          themeParksLabel={labels.themeParks}
        />
      </Link>
    </section>
  );
}
