"use client";

import { useEffect, useState } from "react";
import { HomeBestDestinations } from "@/components/home/HomeBestDestinations";
import { HomeBelowFoldSections } from "@/components/home/HomeBelowFoldSections";
import { HomeLandingSectionClient } from "@/components/home/HomeLandingSectionClient";
import { buildStaticDemoPublicProfilePage } from "@/lib/data/demo-page-static";
import { DEMO_PERSONA } from "@/lib/data/demo-persona";
import {
  readHomeCache,
  writeHomeCache,
} from "@/lib/client/session-page-cache";
import { profilePath } from "@/lib/seo/site";
import { createClient } from "@/lib/supabase/client";
import type { PublicProfilePageData } from "@/lib/supabase/profile-page-data";

export function HomePageClient() {
  const [data, setData] = useState<PublicProfilePageData | null>(null);

  useEffect(() => {
    let cached = readHomeCache();
    if (!cached) {
      cached = buildStaticDemoPublicProfilePage();
      writeHomeCache(cached);
    }

    setData(cached);

    const supabase = createClient();
    let cancelled = false;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      setData((current) =>
        current
          ? {
              ...current,
              isLoggedIn: Boolean(user),
            }
          : current
      );
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setData((current) =>
        current
          ? {
              ...current,
              isLoggedIn: Boolean(session?.user),
            }
          : current
      );
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (!data) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-[46px] pb-[72px] max-sm:px-3.5 max-sm:py-8 max-sm:pb-[54px] lg:max-w-[1400px] lg:px-10 xl:max-w-[1520px] xl:px-12">
      <div className="flex flex-col gap-7 sm:gap-9">
        <HomeLandingSectionClient data={data} />

        <div className="hidden lg:block">
          <HomeBestDestinations desktop />
        </div>

        <div className="flex flex-col gap-7 sm:gap-9 lg:hidden">
          <HomeBelowFoldSections
            name={DEMO_PERSONA.name}
            countries={data.stats.countries}
            cities={data.stats.cities}
            profileHref={profilePath(DEMO_PERSONA.username)}
          />
        </div>
      </div>
    </main>
  );
}
