import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateCityHubForPin } from "@/lib/cache/revalidate-city-hub";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { normalizeCityKey } from "@/lib/utils/city-name";
import { readInstagramUrls, readPhotoUrlsForGallery } from "@/lib/utils/pin-media";
import type { VisitedCity } from "@/types/database";

export type YpProfilePhotoItem = {
  itemId: string;
  cityId: string;
  cityName: string;
  countryCode: string;
  photoUrl: string;
  photoIndex: number;
};

export type YpProfileMediaSnapshot = {
  userId: string;
  username: string;
  cities: Array<{
    id: string;
    city_name: string;
    country_code: string;
    country_name: string;
    photo_urls: string[];
    instagram_urls: string[];
  }>;
  photoItems: YpProfilePhotoItem[];
};

function photoUrlsFromRow(city: VisitedCity): string[] {
  return readPhotoUrlsForGallery(city);
}

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

export async function loadYpProfileMediaSnapshot(
  admin: SupabaseClient,
  userId: string,
  username: string
): Promise<YpProfileMediaSnapshot> {
  const { data, error } = await admin
    .from("visited_cities")
    .select("*")
    .eq("user_id", userId)
    .order("city_name", { ascending: true });

  if (error) throw new Error(error.message);

  const cities = (data ?? []) as VisitedCity[];
  const photoItems: YpProfilePhotoItem[] = [];

  for (const city of cities) {
    const urls = photoUrlsFromRow(city);
    urls.forEach((photoUrl, photoIndex) => {
      photoItems.push({
        itemId: `${city.id}:${photoIndex}:${photoUrl}`,
        cityId: city.id,
        cityName: city.city_name,
        countryCode: city.country_code,
        photoUrl,
        photoIndex,
      });
    });
  }

  return {
    userId,
    username,
    cities: cities.map((city) => ({
      id: city.id,
      city_name: city.city_name,
      country_code: city.country_code,
      country_name: city.country_name,
      photo_urls: photoUrlsFromRow(city),
      instagram_urls: readInstagramUrls(city),
    })),
    photoItems,
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

async function saveCityPhotos(
  admin: SupabaseClient,
  userId: string,
  city: VisitedCity,
  photoUrls: string[]
) {
  const payload = buildMediaPayload(photoUrls, readInstagramUrls(city));
  const { error } = await admin
    .from("visited_cities")
    .update(payload)
    .eq("id", city.id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  await revalidateCityHubForPin(city.country_code, city.city_name);
}

export async function removeYpProfilePhoto(
  admin: SupabaseClient,
  userId: string,
  cityId: string,
  photoUrl: string
) {
  const city = await getCityRow(admin, userId, cityId);
  const next = photoUrlsFromRow(city).filter((url) => url !== photoUrl);
  await saveCityPhotos(admin, userId, city, next);
  await revalidateProfileForPin(admin, userId);
  return { removed: photoUrl, cityId, remaining: next.length };
}

export async function moveYpProfilePhoto(
  admin: SupabaseClient,
  userId: string,
  fromCityId: string,
  toCityId: string,
  photoUrl: string
) {
  if (fromCityId === toCityId) {
    return { moved: false, reason: "same_city" };
  }

  const fromCity = await getCityRow(admin, userId, fromCityId);
  const toCity = await getCityRow(admin, userId, toCityId);

  const fromUrls = photoUrlsFromRow(fromCity).filter((url) => url !== photoUrl);
  const toUrls = photoUrlsFromRow(toCity);
  if (!photoUrlsFromRow(fromCity).includes(photoUrl)) {
    throw new Error("Photo not found on source pin");
  }
  if (!toUrls.includes(photoUrl)) {
    toUrls.push(photoUrl);
  }

  await saveCityPhotos(admin, userId, fromCity, fromUrls);
  await saveCityPhotos(admin, userId, toCity, toUrls);
  await revalidateProfileForPin(admin, userId);

  return {
    moved: true,
    fromCityId,
    toCityId,
    photoUrl,
  };
}

export async function dedupeYpProfilePhotosByExactUrl(
  admin: SupabaseClient,
  userId: string
): Promise<{ removedUrls: number; updatedCities: number }> {
  const { data, error } = await admin
    .from("visited_cities")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const cities = (data ?? []) as VisitedCity[];
  let removedUrls = 0;
  let updatedCities = 0;

  for (const city of cities) {
    const urls = photoUrlsFromRow(city);
    if (urls.length < 2) continue;

    const seen = new Set<string>();
    const kept: string[] = [];
    for (const url of urls) {
      const key = url.toLowerCase();
      if (seen.has(key)) {
        removedUrls += 1;
        continue;
      }
      seen.add(key);
      kept.push(url);
    }

    if (kept.length === urls.length) continue;
    await saveCityPhotos(admin, userId, city, kept);
    updatedCities += 1;
  }

  await revalidateProfileForPin(admin, userId);
  return { removedUrls, updatedCities };
}

async function sha256ForUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const crypto = await import("node:crypto");
    return crypto.createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

export async function dedupeYpProfilePhotosByBytes(
  admin: SupabaseClient,
  userId: string
): Promise<{ removedUrls: number; updatedCities: number }> {
  const { data, error } = await admin
    .from("visited_cities")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const cities = (data ?? []) as VisitedCity[];
  let removedUrls = 0;
  let updatedCities = 0;

  for (const city of cities) {
    const urls = photoUrlsFromRow(city);
    if (urls.length < 2) continue;

    const seenHashes = new Set<string>();
    const kept: string[] = [];

    for (const url of urls) {
      const hash = await sha256ForUrl(url);
      if (!hash) {
        kept.push(url);
        continue;
      }
      if (seenHashes.has(hash)) {
        removedUrls += 1;
        continue;
      }
      seenHashes.add(hash);
      kept.push(url);
    }

    if (kept.length === urls.length) continue;

    await saveCityPhotos(admin, userId, city, kept);
    updatedCities += 1;
  }

  await revalidateProfileForPin(admin, userId);

  return { removedUrls, updatedCities };
}

/** Strip all hosted pin photos; keeps city pins and Instagram URLs (for clean re-import). */
export async function clearAllYpHostedPhotos(
  admin: SupabaseClient,
  userId: string
): Promise<{ clearedCities: number; removedPhotoUrls: number }> {
  const { data, error } = await admin
    .from("visited_cities")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const cities = (data ?? []) as VisitedCity[];
  let clearedCities = 0;
  let removedPhotoUrls = 0;

  for (const city of cities) {
    const urls = photoUrlsFromRow(city);
    if (urls.length === 0) continue;
    removedPhotoUrls += urls.length;
    await saveCityPhotos(admin, userId, city, []);
    clearedCities += 1;
  }

  await revalidateProfileForPin(admin, userId);
  return { clearedCities, removedPhotoUrls };
}

export async function findCityByKey(
  admin: SupabaseClient,
  userId: string,
  countryCode: string,
  cityName: string
): Promise<VisitedCity | null> {
  const code = countryCode.toUpperCase();
  const key = normalizeCityKey(cityName);
  const { data, error } = await admin
    .from("visited_cities")
    .select("*")
    .eq("user_id", userId)
    .eq("country_code", code);
  if (error) throw new Error(error.message);
  return (data ?? []).find((row) => normalizeCityKey(row.city_name) === key) ?? null;
}
