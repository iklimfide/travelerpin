import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateCityHubForPin } from "@/lib/cache/revalidate-city-hub";
import { revalidateParkHubForPin } from "@/lib/cache/revalidate-park-hub";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { readInstagramUrls, readPhotoUrlsForGallery } from "@/lib/utils/pin-media";
import { ELEVATED_PIN_PHOTO_LIMIT } from "@/lib/utils/pin-photo-limits";
import type { VisitedCity, VisitedPark } from "@/types/database";

export type YpPinUploadTarget = {
  id: string;
  kind: "city" | "park";
  label: string;
  countryCode: string;
  photoCount: number;
  photoUrls: string[];
};

export type YpPinUploadSnapshot = {
  userId: string;
  username: string;
  maxPhotosPerPin: number;
  targets: YpPinUploadTarget[];
};

function buildMediaPayload(photoUrls: string[], instagramUrls: string[]) {
  const photos = photoUrls.map((u) => u.trim()).filter(Boolean);
  const ig = instagramUrls.map((u) => u.trim()).filter(Boolean);
  const photo_url = photos[0] ?? null;
  return {
    photo_url,
    photo_urls: photos,
    instagram_urls: ig,
    media_type: photo_url ? ("photo" as const) : ig.length > 0 ? ("instagram" as const) : null,
    media_url: photo_url ?? ig[0] ?? null,
    media_preview_url: photo_url,
    updated_at: new Date().toISOString(),
  };
}

function mergeUniqueUrls(existing: string[], added: string[]): string[] {
  const seen = new Set(existing.map((u) => u.toLowerCase()));
  const out = [...existing];
  for (const raw of added) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export async function loadYpPinUploadSnapshot(
  admin: SupabaseClient,
  userId: string,
  username: string,
  maxPhotosPerPin = ELEVATED_PIN_PHOTO_LIMIT
): Promise<YpPinUploadSnapshot> {
  const [{ data: cities, error: cityError }, { data: parks, error: parkError }] = await Promise.all([
    admin
      .from("visited_cities")
      .select("*")
      .eq("user_id", userId)
      .order("city_name", { ascending: true }),
    admin
      .from("visited_parks")
      .select("*")
      .eq("user_id", userId)
      .order("park_name", { ascending: true }),
  ]);

  if (cityError) throw new Error(cityError.message);
  if (parkError) throw new Error(parkError.message);

  const targets: YpPinUploadTarget[] = [];

  for (const row of (cities ?? []) as VisitedCity[]) {
    const photoUrls = readPhotoUrlsForGallery(row);
    targets.push({
      id: row.id,
      kind: "city",
      label: `${row.city_name}, ${row.country_code}`,
      countryCode: row.country_code,
      photoCount: photoUrls.length,
      photoUrls,
    });
  }

  for (const row of (parks ?? []) as VisitedPark[]) {
    const photoUrls = readPhotoUrlsForGallery(row);
    const typeLabel =
      row.park_type === "theme_park"
        ? "Theme"
        : row.park_type === "botanical_garden"
          ? "Botanical"
          : "National";
    targets.push({
      id: row.id,
      kind: "park",
      label: `${row.park_name} (${typeLabel}), ${row.country_code}`,
      countryCode: row.country_code,
      photoCount: photoUrls.length,
      photoUrls,
    });
  }

  targets.sort((a, b) => a.label.localeCompare(b.label, "en"));

  return {
    userId,
    username,
    maxPhotosPerPin,
    targets,
  };
}

async function getCityRow(
  admin: SupabaseClient,
  userId: string,
  cityId: string
): Promise<VisitedCity> {
  const { data, error } = await admin
    .from("visited_cities")
    .select("*")
    .eq("id", cityId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("City pin not found");
  return data as VisitedCity;
}

async function getParkRow(
  admin: SupabaseClient,
  userId: string,
  parkId: string
): Promise<VisitedPark> {
  const { data, error } = await admin
    .from("visited_parks")
    .select("*")
    .eq("id", parkId)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("Park pin not found");
  return data as VisitedPark;
}

export async function appendYpPhotosToPin(
  admin: SupabaseClient,
  userId: string,
  kind: "city" | "park",
  pinId: string,
  newPhotoUrls: string[],
  maxPhotosPerPin = ELEVATED_PIN_PHOTO_LIMIT
): Promise<{ addedCount: number; totalCount: number; pinId: string; kind: "city" | "park" }> {
  const trimmedNew = newPhotoUrls.map((u) => u.trim()).filter(Boolean);
  if (trimmedNew.length === 0) {
    throw new Error("No photos to add");
  }

  if (kind === "city") {
    const city = await getCityRow(admin, userId, pinId);
    const existing = readPhotoUrlsForGallery(city);
    const remaining = maxPhotosPerPin - existing.length;
    if (remaining <= 0) {
      throw new Error(`Pin already has ${maxPhotosPerPin} photos (limit reached)`);
    }
    const toAdd = trimmedNew.slice(0, remaining);
    const merged = mergeUniqueUrls(existing, toAdd).slice(0, maxPhotosPerPin);
    const payload = buildMediaPayload(merged, readInstagramUrls(city));
    const { error } = await admin
      .from("visited_cities")
      .update(payload)
      .eq("id", city.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    revalidateCityHubForPin(city.country_code, city.city_name);
    await revalidateProfileForPin(admin, userId);
    return {
      addedCount: merged.length - existing.length,
      totalCount: merged.length,
      pinId,
      kind,
    };
  }

  const park = await getParkRow(admin, userId, pinId);
  const existing = readPhotoUrlsForGallery(park);
  const remaining = maxPhotosPerPin - existing.length;
  if (remaining <= 0) {
    throw new Error(`Pin already has ${maxPhotosPerPin} photos (limit reached)`);
  }
  const toAdd = trimmedNew.slice(0, remaining);
  const merged = mergeUniqueUrls(existing, toAdd).slice(0, maxPhotosPerPin);
  const payload = buildMediaPayload(merged, readInstagramUrls(park));
  const { error } = await admin
    .from("visited_parks")
    .update(payload)
    .eq("id", park.id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateParkHubForPin(park.country_code, park.park_name);
  await revalidateProfileForPin(admin, userId);
  return {
    addedCount: merged.length - existing.length,
    totalCount: merged.length,
    pinId,
    kind,
  };
}
