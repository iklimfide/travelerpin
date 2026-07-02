import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileMediaPageView } from "@/components/profile/ProfileMediaPageView";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import {
  buildProfileMediaPins,
  PROFILE_MEDIA_PAGE_SIZE,
  splitProfileMediaItems,
} from "@/lib/utils/profile-media";
import { DEFAULT_DESCRIPTION, profileMediaPath } from "@/lib/seo/site";
import { loadDemoPublicProfilePage } from "@/lib/data/jennifer-demo-page";
import { loadPublicProfilePage } from "@/lib/supabase/profile-page-data";

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
};

export const revalidate = 60;

function parseTab(value: string | undefined): "photos" | "instagram" {
  return value === "instagram" ? "instagram" : "photos";
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = parseTab(tabParam);
  const data = (await loadPublicProfilePage(username)) ?? (await loadDemoPublicProfilePage(username));

  if (!data) {
    return { title: "Traveler not found" };
  }

  const t = await getTranslations("profile");
  const title =
    tab === "instagram"
      ? t("mediaPageTitleInstagram")
      : t("mediaPageTitlePhotos");

  return {
    title,
    description: DEFAULT_DESCRIPTION,
    alternates: {
      canonical: profileMediaPath(data.profile.username, tab),
    },
  };
}

export default async function ProfileMediaPage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const { tab: tabParam, page: pageParam } = await searchParams;
  const tab = parseTab(tabParam);
  const requestedPage = parsePage(pageParam);

  const data = (await loadPublicProfilePage(username)) ?? (await loadDemoPublicProfilePage(username));

  if (!data) {
    notFound();
  }

  const { profile, currentUsername } = data;
  const isOwnProfile = currentUsername === profile.username;
  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
  const memoryPins = buildProfileMediaPins(data.visitedCities, data.visitedParks, profile);
  const { photos, instagram } = splitProfileMediaItems(memoryPins);
  const activeItems = tab === "photos" ? photos : instagram;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / PROFILE_MEDIA_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * PROFILE_MEDIA_PAGE_SIZE;
  const pageItems = activeItems.slice(offset, offset + PROFILE_MEDIA_PAGE_SIZE);

  if (memoryPins.length === 0) {
    notFound();
  }

  const t = await getTranslations("profile");
  const tCommon = await getTranslations("common");

  return (
    <ProfileMediaPageView
      username={profile.username}
      displayName={displayName}
      isOwnProfile={isOwnProfile}
      tab={tab}
      page={page}
      totalPages={totalPages}
      photoCount={photos.length}
      instagramCount={instagram.length}
      items={pageItems}
      visitedCountries={data.visitedCountries}
      visitedCities={data.visitedCities}
      visitedParks={data.visitedParks}
      labels={{
        photosHeading: isOwnProfile ? t("myPhotos") : t("visitorPhotos", { name: displayName }),
        instagramHeading: isOwnProfile
          ? t("myInstagramLinks")
          : t("visitorInstagramLinks", { name: displayName }),
        noInstagramYet: t("noInstagramYet"),
        viewPin: t("viewPin"),
        viewMap: t("viewMap"),
        close: t("closePin"),
        instagramPost: t("instagramPost"),
        viewAll: t("viewAll"),
        editMedia: tCommon("edit"),
        removeMedia: tCommon("delete"),
        removePhotoTitle: t("removePhotoTitle"),
        removePhotoMessage: t("removePhotoMessage"),
        removeInstagramTitle: t("removeInstagramTitle"),
        removeInstagramMessage: t("removeInstagramMessage"),
        mediaPageTitleOwn: t("mediaPageTitleOwn"),
        mediaPageTitleVisitor: t.raw("mediaPageTitleVisitor"),
        mediaPageTabPhotos: t("mediaPageTabPhotos"),
        mediaPageTabInstagram: t("mediaPageTabInstagram"),
        mediaPageBack: t("mediaPageBack"),
        mediaPageEmpty: t("mediaPageEmpty"),
        mediaPagePrev: t("mediaPagePrev"),
        mediaPageNext: t("mediaPageNext"),
        mediaPageStatus: t.raw("mediaPageStatus"),
      }}
    />
  );
}
