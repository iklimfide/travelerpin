import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileJsonLd } from "@/components/profile/ProfileJsonLd";
import { ProfileServerBridge } from "@/components/profile/ProfileServerBridge";
import { PublicProfileViewClient } from "@/components/profile/PublicProfileViewClient";
import {
  getCachedCityHeroImageMap,
  serializeCityHeroImageMap,
} from "@/lib/city/city-hero-images";
import {
  getCachedParkHeroImageMap,
  serializeParkHeroImageMap,
} from "@/lib/park/park-hero-images";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { buildProfileDescription } from "@/lib/seo/profile";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { isProfilePublicPreview } from "@/lib/profile/public-preview";
import {
  EMPTY_TRAVEL_STATS,
  loadPublicProfileShell,
} from "@/lib/supabase/profile-page-data";

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ view?: string }>;
};

export default async function PublicProfilePage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const query = await searchParams;
  const shell = await loadPublicProfileShell(username);
  if (!shell) notFound();

  const displayName = resolveProfileDisplayName(
    shell.profile.display_name,
    shell.profile.username
  );
  const locale: Locale = isLocale(shell.profile.locale) ? shell.profile.locale : defaultLocale;
  const tShare = await getTranslations({ locale, namespace: "share" });
  const profileDescription = buildProfileDescription(displayName, EMPTY_TRAVEL_STATS, {
    captionOwn: tShare("captionOwn"),
    captionGuest: tShare("captionGuest", { name: displayName }),
    captionDescription: tShare("captionDescription"),
  });

  const isAccountOwner =
    shell.currentUsername != null &&
    shell.currentUsername.toLowerCase() === shell.profile.username.toLowerCase();
  const previewAsPublic = isAccountOwner && isProfilePublicPreview(query);
  const isOwnProfile = isAccountOwner && !previewAsPublic;
  const isGuest = !shell.isLoggedIn;

  const [cityHeroImages, parkHeroImages] = await Promise.all([
    getCachedCityHeroImageMap(),
    getCachedParkHeroImageMap(),
  ]);

  return (
    <>
      <ProfileJsonLd profile={shell.profile} profileDescription={profileDescription} />
      <ProfileServerBridge username={shell.profile.username} />
      <PublicProfileViewClient
        shell={shell}
        progressiveLoad
        isOwnProfile={isOwnProfile}
        isGuest={isGuest}
        previewAsPublic={previewAsPublic}
        initialCityHeroImages={serializeCityHeroImageMap(cityHeroImages)}
        initialParkHeroImages={serializeParkHeroImageMap(parkHeroImages)}
      />
    </>
  );
}
