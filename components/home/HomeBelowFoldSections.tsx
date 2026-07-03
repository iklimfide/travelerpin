import { HomeBestDestinations } from "@/components/home/HomeBestDestinations";
import { HomeExplainer } from "@/components/home/HomeExplainer";
import { HomeFeatures } from "@/components/home/HomeFeatures";
import { HomeFinalCta } from "@/components/home/HomeFinalCta";

type HomeBelowFoldSectionsProps = {
  name: string;
  countries: number;
  cities: number;
  compact?: boolean;
  profileHref?: string;
};

export async function HomeBelowFoldSections({
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
      <HomeFeatures compact={compact} />
      <HomeFinalCta compact={compact} />
      {!compact ? <HomeBestDestinations /> : null}
    </>
  );
}
