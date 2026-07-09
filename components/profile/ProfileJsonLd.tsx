import { BRAND } from "@/lib/constants";
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
  const displayName = resolveProfileDisplayName(profile.display_name, profile.username);
  const profileDescription = buildProfileDescription(displayName, stats);
  const publicUrl = buildProfileUrl(profile.username);

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
