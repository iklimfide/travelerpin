import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HomePageClient } from "@/components/home/HomePageClient";
import { getAuthenticatedHomePath } from "@/lib/supabase/authenticated-home";
import { getAuthUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { HOME_TITLE, getSiteUrl } from "@/lib/seo/site";
import {
  PIN_MAP_OG_DESCRIPTION,
  staticOpenGraphImages,
  staticTwitterImages,
} from "@/lib/seo/og";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: HOME_TITLE },
    description: PIN_MAP_OG_DESCRIPTION,
    alternates: { canonical: "/" },
    openGraph: {
      title: "",
      description: PIN_MAP_OG_DESCRIPTION,
      url: getSiteUrl(),
      images: staticOpenGraphImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: "",
      description: PIN_MAP_OG_DESCRIPTION,
      images: staticTwitterImages(),
    },
  };
}

export default async function HomePage() {
  const user = await getAuthUser();
  if (user) {
    const supabase = await createClient();
    if (supabase) {
      redirect(await getAuthenticatedHomePath(supabase));
    }
  }

  return <HomePageClient />;
}
