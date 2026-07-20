import { notFound } from "next/navigation";
import { HomeDesktopProductPanel } from "@/components/home/HomeDesktopProductPanel";
import { HomeHero } from "@/components/home/HomeHero";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { DEMO_PERSONA } from "@/lib/data/demo-persona";
import { loadDemoPublicProfilePage } from "@/lib/data/jennifer-demo-page";
import { buildProfileDescription } from "@/lib/seo/profile";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { worldCoveragePercent } from "@/lib/utils/profile-page";
import { profilePath } from "@/lib/seo/site";

const LANDING_GRID_CLASS =
  "grid items-stretch gap-[34px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 xl:gap-12";

export async function HomeLandingSection() {
  const data = await loadDemoPublicProfilePage(DEMO_PERSONA.username);
  if (!data) notFound();

  const displayName = resolveProfileDisplayName(data.profile.display_name, data.profile.username);
  const profileDescription = buildProfileDescription(displayName, data.stats);
  const isOwnProfile = data.currentUsername === data.profile.username;
  const demoProfileHref = profilePath(DEMO_PERSONA.username);

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
        <PublicProfileView
          data={data}
          profileDescription={profileDescription}
          isOwnProfile={isOwnProfile}
          isGuest={!data.isLoggedIn}
          embedded
          profilePageHref={demoProfileHref}
        />
      </div>
    </section>
  );
}
