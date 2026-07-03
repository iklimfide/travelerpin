import Link from "next/link";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileActionButtons } from "@/components/profile/ProfileActionButtons";
import { ProfileStatCounters } from "@/components/profile/ProfileStatCounters";
import { ProfileWorldProgress } from "@/components/profile/ProfileWorldProgress";
import { TravelerBadge } from "@/components/profile/TravelerBadge";
import { profileAllPath } from "@/lib/seo/site";
import type { TravelStats } from "@/types/database";

function InstagramProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function displayInstagramUrl(url: string): string {
  return url.replace(/\/$/, "");
}

type ProfileIdentityCardProps = {
  avatarUrl: string | null;
  displayName: string;
  username: string;
  bio: string | null;
  instagramUrl?: string | null;
  fallbackBio: string;
  stats: TravelStats;
  isOwnProfile: boolean;
  countryCount: number;
  labels: {
    countries: string;
    cities: string;
    nationalParks: string;
    themeParks: string;
    share: string;
    edit: string;
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

export async function ProfileIdentityCard({
  avatarUrl,
  displayName,
  username,
  bio,
  instagramUrl,
  fallbackBio,
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
  return (
    <section className="profile-card">
      <ProfileActionButtons
        username={username}
        displayName={displayName}
        stats={stats}
        isOwnProfile={isOwnProfile}
        shareLabel={labels.share}
        editLabel={labels.edit}
        followUsername={followUsername}
        followState={followState}
        canFollow={canFollow}
        isLoggedIn={isLoggedIn}
      />

      <div className="profile-avatar-shell">
        {profileHref ? (
          <Link href={profileHref} className="profile-avatar-link" aria-label={`${displayName}'s profile`}>
            <ProfileAvatar
              avatarUrl={avatarUrl}
              displayName={displayName}
              username={username}
              size="lg"
              className="profile-avatar !h-28 !w-28 !rounded-[32px] !text-[38px] !ring-8 !ring-[#eef3f9]"
            />
          </Link>
        ) : (
          <ProfileAvatar
            avatarUrl={avatarUrl}
            displayName={displayName}
            username={username}
            size="lg"
            className="profile-avatar !h-28 !w-28 !rounded-[32px] !text-[38px] !ring-8 !ring-[#eef3f9]"
          />
        )}
      </div>

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
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="profile-instagram-link"
          data-story-exclude=""
        >
          <InstagramProfileIcon />
          <span>{displayInstagramUrl(instagramUrl)}</span>
        </a>
      ) : null}

      <p className="profile-desc">{bio?.trim() || fallbackBio}</p>

      <div className="profile-metrics">
        <ProfileWorldProgress countryCount={countryCount} />

        <ProfileStatCounters
          allHref={profileAllPath(username)}
          countries={stats.countries}
          cities={stats.cities}
          nationalParks={stats.nationalParks}
          themeParks={stats.themeParks}
          countriesLabel={labels.countries}
          citiesLabel={labels.cities}
          nationalParksLabel={labels.nationalParks}
          themeParksLabel={labels.themeParks}
        />
      </div>
    </section>
  );
}
