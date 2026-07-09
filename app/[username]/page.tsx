import { ProfileJsonLd } from "@/components/profile/ProfileJsonLd";
import { ProfileRoute } from "@/components/profile/ProfileRoute";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;

  return (
    <>
      <ProfileJsonLd username={username} />
      <ProfileRoute username={username} />
    </>
  );
}
