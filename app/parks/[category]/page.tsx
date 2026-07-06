import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ParkCategoryPageContent } from "@/components/park/ParkCategoryPageContent";
import { listParkHubsByCategory } from "@/lib/data/park-hubs";
import { getAuthUser } from "@/lib/supabase/auth";
import { DEFAULT_DESCRIPTION, parkCategoryPath, parkCategoryUrl } from "@/lib/seo/site";
import {
  PIN_MAP_OG_DESCRIPTION,
  PIN_MAP_OG_TITLE,
  staticOpenGraphImages,
  staticTwitterImages,
} from "@/lib/seo/og";
import {
  PARK_CATEGORY_SLUGS,
  parseParkCategorySlug,
  type ParkCategorySlug,
} from "@/lib/utils/park-category";
import "../../city/city-page.css";

type PageProps = {
  params: Promise<{ category: string }>;
};

export const revalidate = 86400;

export async function generateStaticParams() {
  return PARK_CATEGORY_SLUGS.map((category) => ({ category }));
}

function categoryTitleKey(category: ParkCategorySlug): "themeParksTitle" | "nationalParksTitle" {
  return category === "theme-parks" ? "themeParksTitle" : "nationalParksTitle";
}

function categoryDescriptionKey(
  category: ParkCategorySlug
): "themeParksDescription" | "nationalParksDescription" {
  return category === "theme-parks" ? "themeParksDescription" : "nationalParksDescription";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: rawCategory } = await params;
  const category = parseParkCategorySlug(rawCategory);
  if (!category) return { title: "Parks" };

  const t = await getTranslations("parksListing");
  const title = t(categoryTitleKey(category));

  return {
    title,
    description: DEFAULT_DESCRIPTION,
    alternates: {
      canonical: parkCategoryPath(category),
    },
    openGraph: {
      title: PIN_MAP_OG_TITLE,
      description: PIN_MAP_OG_DESCRIPTION,
      url: parkCategoryUrl(category),
      images: staticOpenGraphImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: PIN_MAP_OG_TITLE,
      description: PIN_MAP_OG_DESCRIPTION,
      images: staticTwitterImages(),
    },
  };
}

export default async function ParkCategoryPage({ params }: PageProps) {
  const { category: rawCategory } = await params;
  const category = parseParkCategorySlug(rawCategory);
  if (!category) notFound();

  const parks = listParkHubsByCategory(category);
  const [t, tCommon, user] = await Promise.all([
    getTranslations("parksListing"),
    getTranslations("common"),
    getAuthUser(),
  ]);

  const returnPath = parkCategoryPath(category);
  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(returnPath)}`;

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
      <ParkCategoryPageContent
        category={category}
        parks={parks}
        loginHref={loginHref}
        registerHref={registerHref}
        isLoggedIn={Boolean(user)}
        labels={{
          home: t("home"),
          title: t(categoryTitleKey(category)),
          description: t(categoryDescriptionKey(category)),
          parkCount: t("parkCount", { count: parks.length }),
          inCountry: t.raw("inCountry"),
          login: tCommon("login"),
          register: tCommon("register"),
        }}
      />
    </main>
  );
}
