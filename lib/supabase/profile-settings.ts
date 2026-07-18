import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, SharePromptMode } from "@/types/database";

export type ProfileSettingsRow = Pick<
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
  | "locale"
>;

const PROFILE_SELECTS = [
  "username, display_name, avatar_url, cover_url, bio, residence, instagram_url, profession, marital_status, wishlist_public, share_prompt_mode, locale",
  "username, display_name, avatar_url, cover_url, bio, residence, instagram_url, profession, marital_status, wishlist_public, share_prompt_mode",
  "username, display_name, avatar_url, cover_url, bio, residence, instagram_url, profession, marital_status, wishlist_public",
  "username, display_name, avatar_url, cover_url, bio, residence, profession, marital_status, wishlist_public",
] as const;

function parseSharePromptMode(value: unknown): SharePromptMode {
  if (value === "every_pin" || value === "after_30m" || value === "never") {
    return value;
  }
  return "every_pin";
}

function parseLocale(value: unknown): Profile["locale"] {
  return value === "tr" ? "tr" : "en";
}

function normalizeProfileSettings(row: Record<string, unknown>): ProfileSettingsRow {
  return {
    username: String(row.username ?? ""),
    display_name: (row.display_name as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    cover_url: (row.cover_url as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    residence: (row.residence as string | null) ?? null,
    instagram_url: (row.instagram_url as string | null) ?? null,
    profession: (row.profession as string | null) ?? null,
    marital_status: (row.marital_status as string | null) ?? null,
    wishlist_public: row.wishlist_public === true,
    share_prompt_mode: parseSharePromptMode(row.share_prompt_mode),
    locale: parseLocale(row.locale),
  };
}

/** Load settings profile fields; tolerates pending migrations. */
export async function fetchProfileSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileSettingsRow | null> {
  for (const select of PROFILE_SELECTS) {
    const { data, error } = await supabase
      .from("profiles")
      .select(select)
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      return normalizeProfileSettings(data as unknown as Record<string, unknown>);
    }
  }

  return null;
}

const OPTIONAL_UPDATE_COLUMNS = ["locale", "share_prompt_mode", "instagram_url"] as const;

/** Update profile and return settings fields; tolerates pending migrations. */
export async function updateProfileSettings(
  supabase: SupabaseClient,
  userId: string,
  updates: Record<string, unknown>
): Promise<{ profile: ProfileSettingsRow | null; error: string | null }> {
  const currentUpdates = { ...updates };

  for (let attempt = 0; attempt < OPTIONAL_UPDATE_COLUMNS.length + 1; attempt++) {
    const { error } = await supabase.from("profiles").update(currentUpdates).eq("id", userId);

    if (!error) {
      const profile = await fetchProfileSettings(supabase, userId);
      return { profile, error: profile ? null : "Profile not found" };
    }

    const unsupported = OPTIONAL_UPDATE_COLUMNS.find(
      (column) => column in currentUpdates && error.message.includes(column)
    );

    if (!unsupported) {
      return { profile: null, error: error.message };
    }

    delete currentUpdates[unsupported];
    if (Object.keys(currentUpdates).length === 0) {
      const profile = await fetchProfileSettings(supabase, userId);
      return {
        profile,
        error: profile ? null : error.message,
      };
    }
  }

  return { profile: null, error: "Failed to update profile" };
}
