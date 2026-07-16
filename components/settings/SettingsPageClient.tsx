"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProfileSettingsForm } from "@/components/dashboard/ProfileSettingsForm";
import { SettingsPageSkeleton } from "@/components/skeletons/SettingsPageSkeleton";
import {
  readSettingsCache,
  writeSettingsCache,
} from "@/lib/client/session-page-cache";
import { translateSettings } from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";
import type { ProfileSettingsRow } from "@/lib/supabase/profile-settings";
import type { TravelStats } from "@/types/database";

export function SettingsPageClient() {
  const router = useRouter();
  const t = translateSettings;
  // SSR-safe: no localStorage on the first paint.
  const [profile, setProfile] = useState<ProfileSettingsRow | null>(null);
  const [stats, setStats] = useState<TravelStats | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const hit = readSettingsCache();
    if (hit) {
      setProfile(hit.profile);
      setStats(hit.stats);
      setReady(true);
      return;
    }

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
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready || !profile || !stats) {
    return <SettingsPageSkeleton />;
  }

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
