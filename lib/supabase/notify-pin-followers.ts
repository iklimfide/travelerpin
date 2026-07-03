import type { SupabaseClient } from "@supabase/supabase-js";
import {
  notifyFollowersOfCityPin,
  notifyFollowersOfCountryPin,
  notifyFollowersOfParkPin,
} from "@/lib/supabase/notifications";
import { loadActorProfile } from "@/lib/supabase/notify-actor-profile";

export async function notifyFollowersAfterCountryPin(
  supabase: SupabaseClient,
  userId: string,
  country: { id: string; country_code: string; country_name: string }
): Promise<void> {
  const actor = await loadActorProfile(supabase, userId);
  if (!actor) return;
  await notifyFollowersOfCountryPin(supabase, userId, actor, country);
}

export async function notifyFollowersAfterCityPin(
  supabase: SupabaseClient,
  userId: string,
  city: { id: string; city_name: string; country_code: string; country_name: string }
): Promise<void> {
  const actor = await loadActorProfile(supabase, userId);
  if (!actor) return;
  await notifyFollowersOfCityPin(supabase, userId, actor, city);
}

export async function notifyFollowersAfterParkPin(
  supabase: SupabaseClient,
  userId: string,
  park: {
    id: string;
    park_name: string;
    park_type: string;
    country_code: string;
    country_name: string;
  }
): Promise<void> {
  const actor = await loadActorProfile(supabase, userId);
  if (!actor) return;
  await notifyFollowersOfParkPin(supabase, userId, actor, park);
}
