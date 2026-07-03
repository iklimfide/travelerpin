import type { SupabaseClient } from "@supabase/supabase-js";
import type { WishlistCountry } from "@/types/database";
import { normalizeUsernameInput } from "@/lib/utils/username";

export type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  residence: string | null;
  profession: string | null;
  marital_status: string | null;
  wishlist_public: boolean;
};

const EXTENDED_SELECT =
  "id, username, display_name, avatar_url, cover_url, bio, residence, profession, marital_status, wishlist_public";
const BASE_SELECT = "id, username, display_name";

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
      profession: extended.profession ?? null,
      marital_status: extended.marital_status ?? null,
      wishlist_public: extended.wishlist_public === true,
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
    profession: null,
    marital_status: null,
    wishlist_public: wishlistPublic,
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
