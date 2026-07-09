"use client";

import { HomeDesktopProductPanel } from "@/components/home/HomeDesktopProductPanel";
import { HomeHero } from "@/components/home/HomeHero";
import { PublicProfileViewClient } from "@/components/profile/PublicProfileViewClient";
import { worldCoveragePercent } from "@/lib/utils/profile-page";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";

const LANDING_GRID_CLASS =
  "grid items-stretch gap-[34px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 xl:gap-12";

type HomeLandingSectionClientProps = {
  data: PublicProfilePageData;
};

export function HomeLandingSectionClient({ data }: HomeLandingSectionClientProps) {
  const isOwnProfile = data.currentUsername === data.profile.username;

  return (
    <section className={LANDING_GRID_CLASS}>
      <div className="flex h-full min-h-0 min-w-0 flex-col">
        <div className="lg:hidden">
          <HomeHero />
        </div>
        <div className="hidden h-full min-h-0 flex-1 lg:block">
          <HomeDesktopProductPanel
            countries={data.stats.countries}
            cities={data.stats.cities}
            worldPercent={worldCoveragePercent(data.stats.countries)}
          />
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-col lg:h-full">
        <PublicProfileViewClient
          data={data}
          isOwnProfile={isOwnProfile}
          isGuest={!data.isLoggedIn}
          embedded
        />
      </div>
    </section>
  );
}
