"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProfileSettingsForm } from "@/components/dashboard/ProfileSettingsForm";
import { SettingsPageSkeleton } from "@/components/skeletons/SettingsPageSkeleton";
import { writeSettingsCache } from "@/lib/client/session-page-cache";
import { useCachedSettings } from "@/lib/client/use-page-cache";
import { translateSettings } from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";
import type { ProfileSettingsRow } from "@/lib/supabase/profile-settings";
import type { TravelStats } from "@/types/database";

export function SettingsPageClient() {
  const router = useRouter();
  const t = translateSettings;
  const cachedSnapshot = useCachedSettings();
  const [profile, setProfile] = useState<ProfileSettingsRow | null>(null);
  const [stats, setStats] = useState<TravelStats | null>(null);

  const displayProfile = profile ?? cachedSnapshot?.profile ?? null;
  const displayStats = stats ?? cachedSnapshot?.stats ?? null;

  useEffect(() => {
    if (!cachedSnapshot) return;
    setProfile(cachedSnapshot.profile);
    setStats(cachedSnapshot.stats);
  }, [cachedSnapshot]);

  useEffect(() => {
    if (cachedSnapshot) return;

    let cancelled = false;

    void (async () => {
      const res = await fetch("/api/me/settings");
      if (cancelled) return;

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        router.replace("/");
        return;
      }

      const payload = (await res.json()) as {
        profile: ProfileSettingsRow;
        stats: TravelStats;
      };

      writeSettingsCache(payload);
      setProfile(payload.profile);
      setStats(payload.stats);
    })();

    return () => {
      cancelled = true;
    };
  }, [cachedSnapshot, router]);

  if (!displayProfile || !displayStats) {
    return <SettingsPageSkeleton />;
  }

  const mapHref = displayProfile.username ? profilePath(displayProfile.username) : "/";

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        </div>
        {displayProfile.username ? (
          <Link href={mapHref} className="text-sm text-blue-400 hover:text-blue-300">
            {t("backToMap")}
          </Link>
        ) : null}
      </div>
      <ProfileSettingsForm profile={displayProfile} stats={displayStats} />
    </main>
  );
}
