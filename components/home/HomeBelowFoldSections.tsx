"use client";

import { HomeBestDestinations } from "@/components/home/HomeBestDestinations";
import { HomeExplainer } from "@/components/home/HomeExplainer";
import { HomeFeaturesClient } from "@/components/home/HomeFeaturesClient";
import { HomeFinalCta } from "@/components/home/HomeFinalCta";

type HomeBelowFoldSectionsProps = {
  name: string;
  countries: number;
  cities: number;
  compact?: boolean;
  profileHref?: string;
};

export function HomeBelowFoldSections({
  name,
  countries,
  cities,
  compact = false,
  profileHref,
}: HomeBelowFoldSectionsProps) {
  return (
    <>
      <HomeExplainer
        name={name}
        countries={countries}
        cities={cities}
        compact={compact}
        profileHref={profileHref}
      />
      <HomeFeaturesClient compact={compact} />
      <HomeFinalCta compact={compact} />
      {!compact ? <HomeBestDestinations /> : null}
    </>
  );
}
