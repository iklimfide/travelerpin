import { redirectTo } from "@/lib/i18n/navigation";
import { profilePath } from "@/lib/seo/site";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function LegacyProfileRedirect({ params }: PageProps) {
  const { username } = await params;
  await redirectTo(profilePath(username));
}
