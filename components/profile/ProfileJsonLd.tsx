import { BRAND } from "@/lib/constants";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import { profileUrl as buildProfileUrl } from "@/lib/seo/site";
import type { PublicProfile } from "@/lib/supabase/public-profile";

type ProfileJsonLdProps = {
  profile: PublicProfile;
  profileDescription: string;
};

export function ProfileJsonLd({ profile, profileDescription }: ProfileJsonLdProps) {
  const locale: Locale = isLocale(profile.locale) ? profile.locale : defaultLocale;
  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
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
