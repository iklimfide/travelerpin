"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatar";
import { ProfileCoverUpload } from "@/components/profile/ProfileCoverUpload";
import { ShareProfile } from "@/components/share/ShareProfile";
import { useModal } from "@/components/ui/ModalProvider";
import { LIMITS } from "@/lib/constants";
import {
  translateCommon,
  translateSettings,
  translateWishlist,
} from "@/lib/i18n/client-messages";
import {
  MARITAL_STATUS_OPTIONS,
  PROFESSION_OPTIONS,
} from "@/lib/data/profile-options";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import type { Profile, TravelStats } from "@/types/database";

type ProfileSettingsFormProps = {
  profile: Pick<
    Profile,
    | "username"
    | "display_name"
    | "avatar_url"
    | "cover_url"
    | "bio"
    | "residence"
    | "profession"
    | "marital_status"
    | "wishlist_public"
  >;
  stats: TravelStats;
};

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-blue-500";

export function ProfileSettingsForm({ profile, stats }: ProfileSettingsFormProps) {
  const t = translateSettings;
  const tCommon = translateCommon;
  const tWishlist = translateWishlist;
  const modal = useModal();
  const router = useRouter();

  const username = profile.username;
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [coverUrl, setCoverUrl] = useState(profile.cover_url);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [residence, setResidence] = useState(profile.residence ?? "");
  const [profession, setProfession] = useState(profile.profession ?? "");
  const [maritalStatus, setMaritalStatus] = useState(profile.marital_status ?? "");
  const [wishlistPublic, setWishlistPublic] = useState(profile.wishlist_public);
  const [loading, setLoading] = useState(false);

  const previewName = resolveProfileDisplayName(displayName, username);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          residence: residence.trim() || null,
          profession: profession || null,
          marital_status: maritalStatus || null,
          wishlist_public: wishlistPublic,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        await modal.alert(data.error ?? t("saveFailed"), { variant: "error" });
        return;
      }

      await modal.alert(t("saveSuccess"), { variant: "success" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("photoTitle")}
            </h2>
            <div className="mt-3">
              <ProfileAvatarUpload
                compact
                avatarUrl={avatarUrl}
                displayName={previewName}
                username={username}
                disabled={loading}
                onError={(message) => modal.alert(message, { variant: "error" })}
                labels={{
                  changePhoto: t("changePhoto"),
                  removePhoto: t("removePhoto"),
                  hint: t("photoHint"),
                }}
                onChange={(url) => {
                  setAvatarUrl(url);
                  router.refresh();
                }}
              />
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("coverTitle")}
            </h2>
            <div className="mt-3">
              <ProfileCoverUpload
                compact
                coverUrl={coverUrl}
                disabled={loading}
                onError={(message) => modal.alert(message, { variant: "error" })}
                labels={{
                  changePhoto: t("changeCover"),
                  removePhoto: t("removePhoto"),
                }}
                onChange={(url) => {
                  setCoverUrl(url);
                  router.refresh();
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="mb-1 truncate text-xs text-slate-400 sm:text-sm">{t("username")}</p>
            <p className="truncate py-2.5 text-sm text-slate-500">@{username}</p>
          </div>

          <div className="min-w-0">
            <label
              htmlFor="displayName"
              className="mb-1 block truncate text-xs text-slate-400 sm:text-sm"
            >
              {t("displayName")}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`${inputClass} min-w-0 px-2.5 text-sm sm:px-3`}
              maxLength={LIMITS.displayNameMaxLength}
              placeholder={username}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
        <h2 className="text-sm font-semibold text-white">{t("aboutTitle")}</h2>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={LIMITS.bioMaxLength}
              className={`${inputClass} resize-y`}
              placeholder={t("bioPlaceholder")}
              aria-label={t("bio")}
            />
            <p className="mt-1 text-xs text-slate-500">
              {t("charCount", { count: bio.length, max: LIMITS.bioMaxLength })}
            </p>
          </div>

          <div>
            <label htmlFor="residence" className="mb-1 block text-sm text-slate-400">
              {t("residence")}
            </label>
            <input
              id="residence"
              type="text"
              value={residence}
              onChange={(e) => setResidence(e.target.value)}
              className={inputClass}
              maxLength={LIMITS.residenceMaxLength}
              placeholder={t("residencePlaceholder")}
            />
          </div>

          <div>
            <label htmlFor="profession" className="mb-1 block text-sm text-slate-400">
              {t("profession")}
            </label>
            <select
              id="profession"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              className={inputClass}
            >
              {PROFESSION_OPTIONS.map((option) => (
                <option key={option.value || "none"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="maritalStatus" className="mb-1 block text-sm text-slate-400">
              {t("maritalStatus")}
            </label>
            <select
              id="maritalStatus"
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value)}
              className={inputClass}
            >
              {MARITAL_STATUS_OPTIONS.map((option) => (
                <option key={option.value || "none"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
        <h2 className="text-sm font-semibold text-white">{tWishlist("settingsTitle")}</h2>
        <p className="mt-1 text-xs text-slate-500">{tWishlist("settingsHint")}</p>

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={wishlistPublic}
            disabled={loading}
            onChange={(e) => setWishlistPublic(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-950 text-amber-500 focus:ring-amber-500/40"
          />
          <span className="text-sm text-slate-300">
            <span className="font-medium text-white">{tWishlist("publicLabel")}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{tWishlist("publicHint")}</span>
          </span>
        </label>
      </section>

      <ShareProfile
        username={username}
        displayName={previewName}
        stats={stats}
        isOwnProfile
      />

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? tCommon("loading") : t("save")}
      </button>
    </form>
  );
}
