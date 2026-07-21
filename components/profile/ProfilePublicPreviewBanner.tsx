"use client";

import { Link } from "@/lib/i18n/navigation";
import { useTranslateProfile } from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";

type ProfilePublicPreviewBannerProps = {
  username: string;
};

export function ProfilePublicPreviewBanner({ username }: ProfilePublicPreviewBannerProps) {
  const t = useTranslateProfile();

  return (
    <div className="profile-public-preview-banner" role="status">
      <p className="profile-public-preview-banner__text">{t("publicPreviewBanner")}</p>
      <Link href={profilePath(username)} className="profile-public-preview-banner__exit">
        {t("publicPreviewExit")}
      </Link>
    </div>
  );
}
