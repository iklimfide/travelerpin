import { notFound } from "next/navigation";

import { HomeBestDestinations } from "@/components/home/HomeBestDestinations";

import { HomeDesktopProductPanel } from "@/components/home/HomeDesktopProductPanel";

import { HomeHero } from "@/components/home/HomeHero";

import { HomeLandingDemoMediaSections } from "@/components/home/HomeLandingDemoMediaSections";

import { HomeLandingDemoNextRoute } from "@/components/home/HomeLandingDemoNextRoute";

import { PublicProfileView } from "@/components/profile/PublicProfileView";

import { DEMO_PERSONA } from "@/lib/data/demo-persona";

import { loadDemoPublicProfilePage } from "@/lib/data/jennifer-demo-page";

import { buildProfileDescription } from "@/lib/seo/profile";

import { resolveProfileDisplayName } from "@/lib/utils/display-name";

import { worldCoveragePercent } from "@/lib/utils/profile-page";

import { profilePath } from "@/lib/seo/site";



const LANDING_GRID_CLASS =

  "home-landing-section grid items-stretch gap-[34px] lg:grid-cols-2 lg:gap-10 xl:gap-12";



export async function HomeLandingSection() {

  const data = await loadDemoPublicProfilePage(DEMO_PERSONA.username);

  if (!data) notFound();



  const displayName = resolveProfileDisplayName(data.profile.display_name, data.profile.username);

  const profileDescription = buildProfileDescription(displayName, data.stats);

  const isOwnProfile = data.currentUsername === data.profile.username;

  const demoProfileHref = profilePath(DEMO_PERSONA.username);



  const nextRouteProps = {

    data,

    displayName,

    isOwnProfile,

  };



  return (

    <section className={LANDING_GRID_CLASS}>

      <div className="home-landing-left flex min-h-0 min-w-0 flex-col gap-7 lg:min-h-full lg:gap-9">

        <div className="lg:hidden">

          <HomeHero />

        </div>

        <div className="hidden lg:block">

          <HomeDesktopProductPanel

            countries={data.stats.countries}

            cities={data.stats.cities}

            worldPercent={worldCoveragePercent(data.stats.countries)}

          />

        </div>

        <div className="hidden lg:block">

          <HomeBestDestinations stacked />

        </div>

        <div className="hidden lg:block">

          <HomeLandingDemoMediaSections

            data={data}

            displayName={displayName}

            isOwnProfile={isOwnProfile}

          />

        </div>

        <div className="home-landing-next-route hidden lg:block lg:mt-auto">

          <HomeLandingDemoNextRoute {...nextRouteProps} />

        </div>

      </div>

      <div className="home-landing-right flex min-h-0 min-w-0 w-full flex-col items-center gap-7 lg:min-h-full lg:items-stretch lg:gap-0">

        <PublicProfileView

          data={data}

          profileDescription={profileDescription}

          isOwnProfile={isOwnProfile}

          isGuest={!data.isLoggedIn}

          embedded

          animateStats

          omitNextRoute

          mediaSections="instagram"

          profilePageHref={demoProfileHref}

        />

        <div className="home-landing-media-sections w-full max-w-[480px] lg:hidden">
          <HomeLandingDemoMediaSections
            data={data}
            displayName={displayName}
            isOwnProfile={isOwnProfile}
          />
        </div>

        <div className="home-landing-next-route w-full max-w-[480px] lg:hidden">

          <HomeLandingDemoNextRoute

            {...nextRouteProps}

            sectionId="profile-next-route-mobile"

          />

        </div>

      </div>

    </section>

  );

}


