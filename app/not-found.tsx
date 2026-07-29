import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NotFoundExperience } from "@/components/errors/NotFoundExperience";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notFoundPage");
  return {
    title: t("metaTitle"),
    robots: { index: false, follow: true },
  };
}

/** Root-level 404 (outside `[locale]`, e.g. unknown top-level paths). */
export default async function RootNotFound() {
  const t = await getTranslations("notFoundPage");

  return (
    <NotFoundExperience
      copy={{
        stamp: t("stamp"),
        title: t("title"),
        description: t("description"),
        searchPlaceholder: t("searchPlaceholder"),
        explore: t("explore"),
        home: t("home"),
        back: t("back"),
      }}
    />
  );
}
