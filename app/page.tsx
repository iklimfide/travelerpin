import type { Metadata } from "next";
import { TravelMapFocusShell } from "@/components/map/TravelMapFocusShell";
import { getTranslations } from "next-intl/server";
import { HomeGuestAuthBar } from "@/components/home/HomeGuestAuthBar";
import { HomeBestDestinations } from "@/components/home/HomeBestDestinations";
import { HomeBelowFoldSections } from "@/components/home/HomeBelowFoldSections";
import { HomeLandingSection } from "@/components/home/HomeLandingSection";
import { DEMO_PERSONA } from "@/lib/data/demo-persona";
import { loadDemoPublicProfilePage } from "@/lib/data/jennifer-demo-page";
import { DEFAULT_DESCRIPTION, HOME_TITLE, getSiteUrl, profilePath } from "@/lib/seo/site";
import { getAuthUser } from "@/lib/supabase/auth";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: HOME_TITLE },
    description: DEFAULT_DESCRIPTION,
    alternates: { canonical: "/" },
    openGraph: {
      title: HOME_TITLE,
      description: DEFAULT_DESCRIPTION,
      url: getSiteUrl(),
    },
    twitter: {
      card: "summary_large_image",
      title: HOME_TITLE,
      description: DEFAULT_DESCRIPTION,
    },
  };
}

export default async function HomePage() {
  const [data, user, tCommon] = await Promise.all([
    loadDemoPublicProfilePage(DEMO_PERSONA.username),
    getAuthUser(),
    getTranslations("common"),
  ]);
  const loginHref = "/login?next=%2F";
  const registerHref = "/register?next=%2F";

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-[46px] pb-[72px] max-sm:px-3.5 max-sm:py-8 max-sm:pb-[54px] lg:max-w-[1400px] lg:px-10 xl:max-w-[1520px] xl:px-12">
      {!user ? (
        <HomeGuestAuthBar
          loginHref={loginHref}
          registerHref={registerHref}
          loginLabel={tCommon("login")}
          registerLabel={tCommon("register")}
        />
      ) : null}
      <TravelMapFocusShell>
        <div className="flex flex-col gap-7 sm:gap-9">
          <HomeLandingSection />

          <div className="hidden lg:block">
            <HomeBestDestinations desktop />
          </div>

          {data ? (
            <div className="flex flex-col gap-7 sm:gap-9 lg:hidden">
              <HomeBelowFoldSections
                name={DEMO_PERSONA.name}
                countries={data.stats.countries}
                cities={data.stats.cities}
                profileHref={profilePath(DEMO_PERSONA.username)}
              />
            </div>
          ) : null}
        </div>
      </TravelMapFocusShell>
    </main>
  );
}
