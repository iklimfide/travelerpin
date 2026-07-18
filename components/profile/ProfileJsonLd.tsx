import { getTranslations } from "next-intl/server";
import { BRAND } from "@/lib/constants";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { buildProfileDescription } from "@/lib/seo/profile";
import { profileUrl as buildProfileUrl } from "@/lib/seo/site";
import { loadPublicProfileMetadata } from "@/lib/supabase/profile-page-data";

type ProfileJsonLdProps = {
  username: string;
};

export async function ProfileJsonLd({ username }: ProfileJsonLdProps) {
  const data = await loadPublicProfileMetadata(username);
  if (!data) return null;

  const { profile, stats } = data;
  const locale: Locale = isLocale(profile.locale) ? profile.locale : defaultLocale;
  const tShare = await getTranslations({ locale, namespace: "share" });
  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
  const profileDescription = buildProfileDescription(displayName, stats, {
    captionOwn: tShare("captionOwn"),
    captionGuest: tShare("captionGuest", { name: displayName }),
    captionDescription: tShare("captionDescription"),
  });
  const publicUrl = buildProfileUrl(profile.username, locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${displayName} on ${BRAND.name}`,
    description: profileDescription,
    url: publicUrl,
    mainEntity: {
      "@type": "Person",
      name: displayName,
      alternateName: profile.username,
      url: publicUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
