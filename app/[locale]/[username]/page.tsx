import { Suspense } from "react";
import { ProfileJsonLd } from "@/components/profile/ProfileJsonLd";
import { ProfileRoute } from "@/components/profile/ProfileRoute";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;

  return (
    <>
      {/* Do not block the client profile shell on JSON-LD / metadata DB reads. */}
      <Suspense fallback={null}>
        <ProfileJsonLd username={username} />
      </Suspense>
      <ProfileRoute username={username} />
    </>
  );
}
