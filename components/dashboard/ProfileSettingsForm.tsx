"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatar";
import { ProfileCoverUpload } from "@/components/profile/ProfileCoverUpload";
import {
  ResidenceCityPicker,
  type ResidenceCitySelection,
} from "@/components/dashboard/ResidenceCityPicker";
import { ShareProfile } from "@/components/share/ShareProfile";
import { useModal } from "@/components/ui/ModalProvider";
import { LIMITS } from "@/lib/constants";
import {
  translateCommon,
  translateSettings,
  translateWishlist,
} from "@/lib/i18n/client-messages";
import { clearSharePromptThrottle } from "@/lib/client/share-pin-prompt";
import {
  MARITAL_STATUS_OPTIONS,
  PROFESSION_OPTIONS,
} from "@/lib/data/profile-options";
import { resolveProfileDisplayName } from "@/lib/utils/display-name";
import {
  buildInstagramProfileUrl,
  INSTAGRAM_PROFILE_PREFIX,
  instagramUsernameFromInput,
  parseInstagramProfileUrl,
} from "@/lib/utils/instagram";
import type { Profile, SharePromptMode, TravelStats } from "@/types/database";

type ProfileSettingsFormProps = {
  profile: Pick<
    Profile,
    | "username"
    | "display_name"
    | "avatar_url"
    | "cover_url"
    | "bio"
    | "residence"
    | "instagram_url"
    | "profession"
    | "marital_status"
    | "wishlist_public"
    | "share_prompt_mode"
  >;
  stats: TravelStats;
};

function resolveSharePromptMode(value: SharePromptMode | null | undefined): SharePromptMode {
  if (value === "every_pin" || value === "after_30m" || value === "never") {
    return value;
  }
  return "every_pin";
}

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
  const [residenceSelection, setResidenceSelection] = useState<ResidenceCitySelection | null>(
    null
  );
  const [residenceTouched, setResidenceTouched] = useState(false);
  const [instagramUsername, setInstagramUsername] = useState(
    () => parseInstagramProfileUrl(profile.instagram_url ?? "") ?? ""
  );
  const [profession, setProfession] = useState(profile.profession ?? "");
  const [maritalStatus, setMaritalStatus] = useState(profile.marital_status ?? "");
  const [wishlistPublic, setWishlistPublic] = useState(profile.wishlist_public);
  const [sharePromptMode, setSharePromptMode] = useState<SharePromptMode>(
    resolveSharePromptMode(profile.share_prompt_mode)
  );
  const [loading, setLoading] = useState(false);

  const previewName = resolveProfileDisplayName(displayName, username);

  function handleResidenceChange(next: ResidenceCitySelection | null) {
    setResidenceTouched(true);
    setResidenceSelection(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        instagram_url: buildInstagramProfileUrl(instagramUsername),
        profession: profession || null,
        marital_status: maritalStatus || null,
        wishlist_public: wishlistPublic,
        share_prompt_mode: sharePromptMode,
      };

      // Residence is a city pin: only send when the picker was used or hydrated.
      if (residenceSelection) {
        body.residence_city = residenceSelection;
      } else if (residenceTouched) {
        body.residence = null;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        await modal.alert(data.error ?? t("saveFailed"), { variant: "error" });
        return;
      }

      if (sharePromptMode !== "after_30m") {
        clearSharePromptThrottle();
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
            <label htmlFor="instagramUsername" className="mb-1 block text-sm text-slate-400">
              {t("instagramProfile")}
            </label>
            <div className="flex overflow-hidden rounded-lg border border-slate-700 bg-slate-950 focus-within:border-blue-500">
              <span className="shrink-0 select-none border-r border-slate-700 px-3 py-2.5 text-sm text-slate-500">
                {INSTAGRAM_PROFILE_PREFIX}
              </span>
              <input
                id="instagramUsername"
                type="text"
                value={instagramUsername}
                onChange={(e) => setInstagramUsername(instagramUsernameFromInput(e.target.value))}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text");
                  if (!pasted) return;
                  if (
                    /instagram\.com/i.test(pasted) ||
                    pasted.includes("/") ||
                    pasted.startsWith("@") ||
                    /^https?:\/\//i.test(pasted)
                  ) {
                    e.preventDefault();
                    setInstagramUsername(instagramUsernameFromInput(pasted));
                  }
                }}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none"
                maxLength={30}
                placeholder={t("instagramProfilePlaceholder")}
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">{t("instagramProfileHint")}</p>
          </div>

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
            <ResidenceCityPicker
              initialResidence={profile.residence}
              value={residenceSelection}
              onChange={handleResidenceChange}
              disabled={loading}
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

        <div className="mt-5 border-t border-slate-800 pt-4">
          <h3 className="text-sm font-medium text-white">{tWishlist("sharePromptTitle")}</h3>
          <p className="mt-1 text-xs text-slate-500">{tWishlist("sharePromptHint")}</p>

          <div className="mt-3 space-y-3">
            {(
              [
                {
                  value: "every_pin" as const,
                  label: tWishlist("sharePromptEveryPin"),
                  hint: tWishlist("sharePromptEveryPinHint"),
                },
                {
                  value: "after_30m" as const,
                  label: tWishlist("sharePromptAfter30m"),
                  hint: tWishlist("sharePromptAfter30mHint"),
                },
                {
                  value: "never" as const,
                  label: tWishlist("sharePromptNever"),
                  hint: tWishlist("sharePromptNeverHint"),
                },
              ] as const
            ).map((option) => (
              <label key={option.value} className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="sharePromptMode"
                  value={option.value}
                  checked={sharePromptMode === option.value}
                  disabled={loading}
                  onChange={() => setSharePromptMode(option.value)}
                  className="mt-0.5 h-4 w-4 border-slate-600 bg-slate-950 text-amber-500 focus:ring-amber-500/40"
                />
                <span className="text-sm text-slate-300">
                  <span className="font-medium text-white">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
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
