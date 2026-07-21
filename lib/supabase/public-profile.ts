import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WishlistCountry, NextRouteStop } from "@/types/database";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { parseNextRoute } from "@/lib/utils/next-route";
import { normalizeUsernameInput } from "@/lib/utils/username";

export type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  residence: string | null;
  instagram_url: string | null;
  profession: string | null;
  marital_status: string | null;
  wishlist_public: boolean;
  /** Owner preferred locale for OG / link-preview copy. */
  locale: "en" | "tr";
  next_route: NextRouteStop[];
};

const EXTENDED_SELECT =
  "id, username, display_name, avatar_url, cover_url, bio, residence, instagram_url, profession, marital_status, wishlist_public, next_route, locale";
const EXTENDED_SELECT_NO_LOCALE =
  "id, username, display_name, avatar_url, cover_url, bio, residence, instagram_url, profession, marital_status, wishlist_public, next_route";
const LEGACY_EXTENDED_SELECT =
  "id, username, display_name, avatar_url, cover_url, bio, residence, profession, marital_status, wishlist_public";
const BASE_SELECT = "id, username, display_name";

const PROFILE_PRESENTATION_SELECT =
  "avatar_url, display_name, cover_url, bio, residence, instagram_url, profession, marital_status, wishlist_public, next_route, locale";
const PROFILE_PRESENTATION_SELECT_NO_LOCALE =
  "avatar_url, display_name, cover_url, bio, residence, instagram_url, profession, marital_status, wishlist_public, next_route";

function parseProfileLocale(value: unknown): "en" | "tr" {
  return value === "tr" ? "tr" : "en";
}

function mapExtendedRow(row: Record<string, unknown>): PublicProfile {
  return {
    id: String(row.id ?? ""),
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
    locale: parseProfileLocale(row.locale),
    next_route: parseNextRoute(row.next_route),
  };
}

/** Profile presentation fields change independently of pin rows — keep them out of stale pin cache. */
async function fetchFreshProfilePresentationQuery(
  supabase: SupabaseClient,
  profileId: string
): Promise<Partial<PublicProfile> | null> {
  for (const select of [PROFILE_PRESENTATION_SELECT, PROFILE_PRESENTATION_SELECT_NO_LOCALE]) {
    const { data, error } = await supabase
      .from("profiles")
      .select(select)
      .eq("id", profileId)
      .maybeSingle();

    if (!error && data) {
      const row = data as unknown as Record<string, unknown>;
      return {
        avatar_url: (row.avatar_url as string | null) ?? null,
        display_name: (row.display_name as string | null) ?? null,
        cover_url: (row.cover_url as string | null) ?? null,
        bio: (row.bio as string | null) ?? null,
        residence: (row.residence as string | null) ?? null,
        instagram_url: (row.instagram_url as string | null) ?? null,
        profession: (row.profession as string | null) ?? null,
        marital_status: (row.marital_status as string | null) ?? null,
        wishlist_public: row.wishlist_public === true,
        locale: parseProfileLocale(row.locale),
        next_route: parseNextRoute(row.next_route),
      };
    }
  }

  return null;
}

/** Request-scoped dedup when layout metadata and page loader run in the same render. */
export const fetchFreshProfilePresentation = cache(
  async (profileId: string): Promise<Partial<PublicProfile> | null> => {
    const supabase = createPublicSupabaseClient();
    if (!supabase) return null;
    return fetchFreshProfilePresentationQuery(supabase, profileId);
  }
);

/** Load profile for public pages; tolerates missing profile-detail migration. */
export async function fetchPublicProfile(
  supabase: SupabaseClient,
  username: string
): Promise<PublicProfile | null> {
  const normalized = normalizeUsernameInput(username);

  for (const select of [EXTENDED_SELECT, EXTENDED_SELECT_NO_LOCALE]) {
    const { data: extended, error: extendedError } = await supabase
      .from("profiles")
      .select(select)
      .eq("username", normalized)
      .single();

    if (!extendedError && extended) {
      return mapExtendedRow(extended as unknown as Record<string, unknown>);
    }
  }

  const { data: legacyExtended, error: legacyExtendedError } = await supabase
    .from("profiles")
    .select(LEGACY_EXTENDED_SELECT)
    .eq("username", normalized)
    .single();

  if (!legacyExtendedError && legacyExtended) {
    return {
      ...legacyExtended,
      avatar_url: legacyExtended.avatar_url ?? null,
      cover_url: legacyExtended.cover_url ?? null,
      bio: legacyExtended.bio ?? null,
      residence: legacyExtended.residence ?? null,
      instagram_url: null,
      profession: legacyExtended.profession ?? null,
      marital_status: legacyExtended.marital_status ?? null,
      wishlist_public: legacyExtended.wishlist_public === true,
      locale: "en",
      next_route: [],
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(BASE_SELECT)
    .eq("username", normalized)
    .single();

  if (error || !profile) return null;

  let wishlistPublic = false;
  const { data: settings } = await supabase
    .from("profiles")
    .select("wishlist_public")
    .eq("id", profile.id)
    .maybeSingle();

  if (settings?.wishlist_public === true) {
    wishlistPublic = true;
  }

  return {
    ...profile,
    avatar_url: null,
    cover_url: null,
    bio: null,
    residence: null,
    instagram_url: null,
    profession: null,
    marital_status: null,
    wishlist_public: wishlistPublic,
    locale: "en",
    next_route: [],
  };
}

export async function fetchPublicWishlistCountries(
  supabase: SupabaseClient,
  userId: string,
  wishlistPublic: boolean
): Promise<WishlistCountry[]> {
  if (!wishlistPublic) return [];

  const { data, error } = await supabase
    .from("wishlist_countries")
    .select("*")
    .eq("user_id", userId)
    .order("country_name", { ascending: true });

  if (error) return [];
  return (data ?? []) as WishlistCountry[];
}
