import { HomeBelowFoldSections } from "@/components/home/HomeBelowFoldSections";
import { HomeLandingSection } from "@/components/home/HomeLandingSection";
import { DEMO_PERSONA } from "@/lib/data/demo-persona";
import { loadDemoPublicProfilePage } from "@/lib/data/jennifer-demo-page";
import { profilePath } from "@/lib/seo/site";

/** Guest landing content reused behind /login and /register so the add FAB has the homepage behind it. */
export async function GuestHomeMain() {
  const showcaseData = await loadDemoPublicProfilePage(DEMO_PERSONA.username);
  const stats = showcaseData?.stats ?? { countries: 41, cities: 124, nationalParks: 0, themeParks: 0 };

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-[46px] pb-[72px] max-sm:px-3.5 max-sm:py-8 max-sm:pb-[54px] lg:max-w-[1400px] lg:px-10 xl:max-w-[1520px] xl:px-12">
      <div className="flex flex-col gap-7 sm:gap-9">
        <HomeLandingSection />

        <div className="flex flex-col gap-7 sm:gap-9 lg:hidden">
          <HomeBelowFoldSections
            name={DEMO_PERSONA.name}
            countries={stats.countries}
            cities={stats.cities}
            profileHref={profilePath(DEMO_PERSONA.username)}
          />
        </div>
      </div>
    </main>
  );
}
