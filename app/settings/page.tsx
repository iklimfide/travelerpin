import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileSettingsForm } from "@/components/dashboard/ProfileSettingsForm";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileSettings } from "@/lib/supabase/profile-settings";
import { computeTravelStats } from "@/lib/utils/stats";
import { profilePath } from "@/lib/seo/site";
import type { VisitedCity, VisitedCountry, VisitedPark } from "@/types/database";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const t = await getTranslations("settings");

  const profile = await fetchProfileSettings(supabase, user.id);

  if (!profile) {
    // Authenticated but profile row is missing — not a sign-out.
    redirect("/");
  }

  const [{ data: countries }, { data: cities }, { data: parks }] = await Promise.all([
    supabase.from("visited_countries").select("country_code").eq("user_id", user.id),
    supabase
      .from("visited_cities")
      .select("country_code, visit_dates")
      .eq("user_id", user.id),
    supabase.from("visited_parks").select("country_code, park_type").eq("user_id", user.id),
  ]);

  const stats = computeTravelStats(
    (countries ?? []) as VisitedCountry[],
    (cities ?? []) as VisitedCity[],
    (parks ?? []) as VisitedPark[]
  );

  const mapHref = profile.username ? profilePath(profile.username) : "/";

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
          </div>
          {profile.username ? (
            <Link href={mapHref} className="text-sm text-blue-400 hover:text-blue-300">
              {t("backToMap")}
            </Link>
          ) : null}
        </div>

        <ProfileSettingsForm profile={profile} stats={stats} />
      </main>
  );
}
