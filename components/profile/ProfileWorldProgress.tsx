"use client";

import { WORLD_COUNTRY_TOTAL, worldCoveragePercent } from "@/lib/utils/profile-page";
import { translateProfile } from "@/lib/i18n/client-messages";

type ProfileWorldProgressProps = {
  countryCount: number;
};

export function ProfileWorldProgress({ countryCount }: ProfileWorldProgressProps) {
  const t = translateProfile;
  const coverage = worldCoveragePercent(countryCount);

  return (
    <div className="profile-world-progress">
      <div className="profile-world-progress__top">
        <strong>
          <span aria-hidden>🌍</span> {t("worldExplored")}
        </strong>
        <span className="profile-world-progress__percent">{coverage}%</span>
      </div>
      <div className="profile-world-progress__bar" aria-hidden>
        <div className="profile-world-progress__fill" style={{ width: `${coverage}%` }} />
      </div>
      <p className="profile-world-progress__caption">
        {t("worldExploredCaption", {
          pinned: countryCount,
          total: WORLD_COUNTRY_TOTAL,
        })}
      </p>
    </div>
  );
}
