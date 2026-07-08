import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileInstagramLink } from "@/components/profile/ProfileInstagramLink";
import { ProfileStatCounters } from "@/components/profile/ProfileStatCounters";
import { TravelerBadge } from "@/components/profile/TravelerBadge";
import type { TravelStats } from "@/types/database";

type ProfileSquareCaptureHeaderProps = {
  avatarUrl: string | null;
  displayName: string;
  username: string;
  countryCount: number;
  instagramUrl?: string | null;
  instagramSampleNotice?: string | null;
  stats: TravelStats;
  labels: {
    countries: string;
    cities: string;
    nationalParks: string;
    themeParks: string;
  };
};

/** Compact identity strip — only visible while the square share PNG is captured. */
export async function ProfileSquareCaptureHeader({
  avatarUrl,
  displayName,
  username,
  countryCount,
  instagramUrl,
  instagramSampleNotice,
  stats,
  labels,
}: ProfileSquareCaptureHeaderProps) {
  return (
    <div className="profile-square-capture-header" aria-hidden="true">
      <ProfileAvatar
        avatarUrl={avatarUrl}
        displayName={displayName}
        username={username}
        size="md"
        className="profile-square-capture-header__avatar"
      />
      <h2 className="profile-square-capture-header__name">{displayName}</h2>
      <div className="profile-square-capture-header__badge">
        <TravelerBadge countryCount={countryCount} className="traveler-badge--profile-card" />
      </div>
      {instagramUrl ? (
        <ProfileInstagramLink url={instagramUrl} sampleNotice={instagramSampleNotice} />
      ) : (
        <span className="profile-instagram-spacer" aria-hidden="true" />
      )}
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
    </div>
  );
}
