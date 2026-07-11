import type { SupabaseClient } from "@supabase/supabase-js";
import type { WishlistCountry, NextRouteStop } from "@/types/database";
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
  next_route: NextRouteStop[];
};

const EXTENDED_SELECT =
  "id, username, display_name, avatar_url, cover_url, bio, residence, instagram_url, profession, marital_status, wishlist_public, next_route";
const LEGACY_EXTENDED_SELECT =
  "id, username, display_name, avatar_url, cover_url, bio, residence, profession, marital_status, wishlist_public";
const BASE_SELECT = "id, username, display_name";

const PROFILE_PRESENTATION_SELECT =
  "avatar_url, display_name, cover_url, bio, residence, instagram_url, profession, marital_status, wishlist_public, next_route";

/** Profile presentation fields change independently of pin rows — keep them out of stale pin cache. */
export async function fetchFreshProfilePresentation(
  supabase: SupabaseClient,
  profileId: string
): Promise<Partial<PublicProfile> | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_PRESENTATION_SELECT)
    .eq("id", profileId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    avatar_url: data.avatar_url ?? null,
    display_name: data.display_name ?? null,
    cover_url: data.cover_url ?? null,
    bio: data.bio ?? null,
    residence: data.residence ?? null,
    instagram_url: data.instagram_url ?? null,
    profession: data.profession ?? null,
    marital_status: data.marital_status ?? null,
    wishlist_public: data.wishlist_public === true,
    next_route: parseNextRoute(data.next_route),
  };
}

/** Load profile for public pages; tolerates missing profile-detail migration. */
export async function fetchPublicProfile(
  supabase: SupabaseClient,
  username: string
): Promise<PublicProfile | null> {
  const normalized = normalizeUsernameInput(username);

  const { data: extended, error: extendedError } = await supabase
    .from("profiles")
    .select(EXTENDED_SELECT)
    .eq("username", normalized)
    .single();

  if (!extendedError && extended) {
    return {
      ...extended,
      avatar_url: extended.avatar_url ?? null,
      cover_url: extended.cover_url ?? null,
      bio: extended.bio ?? null,
      residence: extended.residence ?? null,
      instagram_url: extended.instagram_url ?? null,
      profession: extended.profession ?? null,
      marital_status: extended.marital_status ?? null,
      wishlist_public: extended.wishlist_public === true,
      next_route: parseNextRoute(extended.next_route),
    };
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
