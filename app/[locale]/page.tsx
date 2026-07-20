import type { Metadata } from "next";
import { HomeBestDestinations } from "@/components/home/HomeBestDestinations";
import { HomeBelowFoldSections } from "@/components/home/HomeBelowFoldSections";
import { HomeLandingSection } from "@/components/home/HomeLandingSection";
import { DEMO_PERSONA, getDemoTravelStats } from "@/lib/data/demo-persona";
import { redirectTo } from "@/lib/i18n/redirect-to";
import { getAuthenticatedHomePath } from "@/lib/supabase/authenticated-home";
import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { HOME_TITLE, getSiteUrl, profilePath } from "@/lib/seo/site";
import {
  PIN_MAP_OG_DESCRIPTION,
  staticOpenGraphImages,
  staticTwitterImages,
} from "@/lib/seo/og";
import "@/app/styles/profile.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: HOME_TITLE },
    description: PIN_MAP_OG_DESCRIPTION,
    alternates: { canonical: "/" },
    openGraph: {
      title: "",
      description: PIN_MAP_OG_DESCRIPTION,
      url: getSiteUrl(),
      images: staticOpenGraphImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: "",
      description: PIN_MAP_OG_DESCRIPTION,
      images: staticTwitterImages(),
    },
  };
}

export default async function HomePage() {
  const user = await getAuthUser();
  if (user) {
    const supabase = await createClient();
    if (supabase) {
      await redirectTo(await getAuthenticatedHomePath(supabase));
    }
  }

  const stats = getDemoTravelStats();

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-[46px] pb-[72px] max-sm:px-3.5 max-sm:py-8 max-sm:pb-[54px] lg:max-w-[1400px] lg:px-10 xl:max-w-[1520px] xl:px-12">
      <div className="flex flex-col gap-7 sm:gap-9">
        <HomeLandingSection />

        <div className="hidden lg:block">
          <HomeBestDestinations desktop />
        </div>

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
