import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateCityHubForPin } from "@/lib/cache/revalidate-city-hub";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { deleteR2Objects, isR2Configured, parseR2ObjectKey } from "@/lib/storage/r2";
import { deletePinNotifications } from "@/lib/supabase/notifications";
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
  photoUrls: string[],
  instagramUrls?: string[]
) {
  const ig = instagramUrls ?? readInstagramUrls(city);
  const payload = buildMediaPayload(photoUrls, ig);
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

/** Move every hosted photo from one city pin to another (optional IG links too). */
export async function moveAllYpProfilePhotosBetweenCities(
  admin: SupabaseClient,
  userId: string,
  fromCityId: string,
  toCityId: string,
  options?: { mergeInstagramUrls?: boolean }
): Promise<{ movedPhotoCount: number; mergedInstagramCount: number; fromCityId: string; toCityId: string }> {
  if (fromCityId === toCityId) {
    throw new Error("Kaynak ve hedef pin aynı olamaz");
  }

  const mergeInstagramUrls = options?.mergeInstagramUrls !== false;
  const fromCity = await getCityRow(admin, userId, fromCityId);
  const toCity = await getCityRow(admin, userId, toCityId);

  const fromPhotos = photoUrlsFromRow(fromCity);
  if (fromPhotos.length === 0) {
    return { movedPhotoCount: 0, mergedInstagramCount: 0, fromCityId, toCityId };
  }

  const toPhotos = mergeUniqueUrls(photoUrlsFromRow(toCity), fromPhotos);
  let mergedInstagramCount = 0;

  if (mergeInstagramUrls) {
    const fromIg = readInstagramUrls(fromCity);
    const before = readInstagramUrls(toCity).length;
    const toIg = mergeUniqueUrls(readInstagramUrls(toCity), fromIg);
    mergedInstagramCount = toIg.length - before;
    await saveCityPhotos(admin, userId, toCity, toPhotos, toIg);
    await saveCityPhotos(admin, userId, fromCity, [], []);
  } else {
    await saveCityPhotos(admin, userId, toCity, toPhotos);
    await saveCityPhotos(admin, userId, fromCity, []);
  }

  await revalidateProfileForPin(admin, userId);

  return {
    movedPhotoCount: fromPhotos.length,
    mergedInstagramCount,
    fromCityId,
    toCityId,
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

/** Profilden şehir pin’ini tamamen kaldır (katalogda olmasa da). */
export async function deleteYpProfileCityPin(
  admin: SupabaseClient,
  userId: string,
  cityId: string
): Promise<{ cityName: string; countryCode: string; countryRemoved: boolean }> {
  const city = await getCityRow(admin, userId, cityId);
  const code = city.country_code.toUpperCase();
  const cityName = city.city_name;

  const r2Keys: string[] = [];
  if (isR2Configured()) {
    for (const url of photoUrlsFromRow(city)) {
      const key = parseR2ObjectKey(url.split("?")[0] ?? url);
      if (key) r2Keys.push(key);
    }
  }

  const { error: deleteError } = await admin
    .from("visited_cities")
    .delete()
    .eq("id", cityId)
    .eq("user_id", userId);
  if (deleteError) throw new Error(deleteError.message);

  await deletePinNotifications(admin, userId, "city", cityId);

  const { count: remainingCities } = await admin
    .from("visited_cities")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("country_code", code);

  let countryRemoved = false;
  if ((remainingCities ?? 0) === 0) {
    const { data: countryRow } = await admin
      .from("visited_countries")
      .select("id")
      .eq("user_id", userId)
      .eq("country_code", code)
      .maybeSingle();
    if (countryRow?.id) {
      await admin.from("visited_countries").delete().eq("id", countryRow.id).eq("user_id", userId);
      await deletePinNotifications(admin, userId, "country", countryRow.id);
      countryRemoved = true;
    }
  }

  if (r2Keys.length > 0) {
    try {
      await deleteR2Objects(r2Keys);
    } catch (err) {
      console.warn("deleteYpProfileCityPin R2 cleanup failed:", err);
    }
  }

  revalidateCityHubForPin(code, cityName);
  await revalidateProfileForPin(admin, userId);

  return { cityName, countryCode: code, countryRemoved };
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
