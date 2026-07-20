import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProfileJsonLd } from "@/components/profile/ProfileJsonLd";
import { ProfileRoute } from "@/components/profile/ProfileRoute";
import { loadPublicProfilePage } from "@/lib/supabase/profile-page-data";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const initialData = await loadPublicProfilePage(username);
  if (!initialData) notFound();

  return (
    <>
      {/* Do not block the profile body on JSON-LD / metadata DB reads. */}
      <Suspense fallback={null}>
        <ProfileJsonLd username={username} />
      </Suspense>
      <ProfileRoute username={username} initialData={initialData} />
    </>
  );
}
