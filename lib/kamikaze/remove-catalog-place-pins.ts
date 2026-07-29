import { revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canonicalCatalogCityName,
  cityHeroR2ObjectKeys,
  revalidateCityHeroCaches,
} from "@/lib/city/city-hero-images";
import { revalidateCityHubForPin } from "@/lib/cache/revalidate-city-hub";
import { revalidateProfileForPin } from "@/lib/cache/revalidate-profile";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import { revalidateCatalogOverlay } from "@/lib/kamikaze/catalog-overlay";
import {
  deleteR2Objects,
  isR2Configured,
  parseR2ObjectKey,
} from "@/lib/storage/r2";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import {
  parseNextRoutePayload,
  serializeNextRoutePayload,
} from "@/lib/utils/next-route";
import { readPhotoUrlsForGallery } from "@/lib/utils/pin-media";
import type { NextRouteStop, VisitedCity } from "@/types/database";

function isMissingRelationError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("schema cache") ||
    lower.includes("could not find the table")
  );
}

function cityPinMatches(row: Pick<VisitedCity, "city_name">, code: string, nameKey: string): boolean {
  return Boolean(row.city_name && catalogNameKey(row.city_name, code) === nameKey);
}

function nextRouteCityStopMatches(stop: NextRouteStop, code: string, nameKey: string): boolean {
  if (stop.kind !== "city") return false;
  const stopCode = stop.countryCode?.trim().toUpperCase();
  if (!stopCode || stopCode !== code) return false;
  return catalogNameKey(stop.name, code) === nameKey;
}

export type PurgeCatalogCityResult = {
  removedPins: number;
  removedR2Objects: number;
  userIds: string[];
  scrubbedNextRoutes: number;
};

/**
 * Admin YP şehir silme: katalog, pinler, medya (R2), kapak, TR/popüler, next_route — hepsi.
 */
export async function purgeCatalogCityFromSite(
  admin: SupabaseClient,
  countryCode: string,
  catalogNameRaw: string
): Promise<string | null> {
  const code = countryCode.trim().toUpperCase();
  const displayName = formatCityDisplayName(catalogNameRaw.trim());
  const canonical = canonicalCatalogCityName(code, displayName);
  const nameKey = catalogNameKey(canonical, code);

  if (code.length !== 2 || !displayName || !nameKey) {
    return "Geçersiz şehir";
  }

  const userIds = new Set<string>();
  const r2Keys = new Set<string>();

  const { data: pinRows, error: pinReadError } = await admin
    .from("visited_cities")
    .select("*")
    .eq("country_code", code);

  if (pinReadError) return pinReadError.message;

  const matchingPins = ((pinRows ?? []) as VisitedCity[]).filter((row) =>
    cityPinMatches(row, code, nameKey)
  );

  for (const row of matchingPins) {
    userIds.add(row.user_id);
    for (const url of readPhotoUrlsForGallery(row)) {
      const key = parseR2ObjectKey(url.split("?")[0] ?? url);
      if (key) r2Keys.add(key);
    }
  }

  if (matchingPins.length > 0) {
    const ids = matchingPins.map((row) => row.id);
    const { error: pinDeleteError } = await admin.from("visited_cities").delete().in("id", ids);
    if (pinDeleteError) return pinDeleteError.message;
  }

  const { data: ypRows } = await admin.from("yp_catalog_cities").select("id, name").eq("country_code", code);

  for (const row of ypRows ?? []) {
    if (!row.name || catalogNameKey(String(row.name), code) !== nameKey) continue;
    await admin.from("yp_catalog_cities").delete().eq("id", row.id);
  }

  const { error: exclusionError } = await admin.from("yp_catalog_exclusions").insert({
    kind: "city",
    country_code: code,
    name_key: nameKey,
  });
  if (exclusionError && !exclusionError.message.toLowerCase().includes("duplicate")) {
    if (!isMissingRelationError(exclusionError.message)) {
      return exclusionError.message;
    }
  }

  if (isR2Configured()) {
    for (const key of cityHeroR2ObjectKeys(code, nameKey)) {
      r2Keys.add(key);
    }
  }

  const { error: heroDeleteError } = await admin
    .from("yp_city_hero_image")
    .delete()
    .eq("country_code", code)
    .eq("name_key", nameKey);
  if (heroDeleteError && !isMissingRelationError(heroDeleteError.message)) {
    return heroDeleteError.message;
  }

  for (const table of ["yp_city_name_tr", "yp_city_popularity"] as const) {
    const { error } = await admin.from(table).delete().eq("country_code", code).eq("name_key", nameKey);
    if (error && !isMissingRelationError(error.message)) {
      return error.message;
    }
  }

  let scrubbedNextRoutes = 0;
  const { data: profileRows, error: profileReadError } = await admin
    .from("profiles")
    .select("id, username, next_route")
    .not("next_route", "is", null);

  if (profileReadError) {
    return profileReadError.message;
  }

  for (const profile of profileRows ?? []) {
    const payload = parseNextRoutePayload(profile.next_route);
    const before = payload.stops.length;
    const stops = payload.stops.filter((stop) => !nextRouteCityStopMatches(stop, code, nameKey));
    if (stops.length === before) continue;

    scrubbedNextRoutes += 1;
    userIds.add(profile.id);

    const { error: routeUpdateError } = await admin
      .from("profiles")
      .update({
        next_route: serializeNextRoutePayload({ ...payload, stops }),
      })
      .eq("id", profile.id);

    if (routeUpdateError) return routeUpdateError.message;
  }

  if (isR2Configured() && r2Keys.size > 0) {
    try {
      await deleteR2Objects([...r2Keys]);
    } catch (err) {
      console.warn("purgeCatalogCityFromSite R2 delete failed:", err);
    }
  }

  revalidateCityHubForPin(code, canonical);
  await revalidateCityHeroCaches(code, canonical);
  await revalidateCatalogOverlay();

  for (const userId of userIds) {
    await revalidateProfileForPin(admin, userId);
    const { data: profile } = await admin
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.username?.trim().toLowerCase() === "guvencgiller") {
      revalidateTag("jennifer-demo-guvenc-pins-v4", "max");
    }
  }

  return null;
}

/** @deprecated use purgeCatalogCityFromSite */
export async function removeUserPinsForCatalogCity(
  admin: SupabaseClient,
  countryCode: string,
  catalogName: string
): Promise<{ removedPins: number; userIds: string[] }> {
  const err = await purgeCatalogCityFromSite(admin, countryCode, catalogName);
  if (err) throw new Error(err);
  return { removedPins: 0, userIds: [] };
}

export async function revalidateAfterCatalogCityRemoved(
  admin: SupabaseClient,
  countryCode: string,
  catalogName: string,
  userIds: string[]
): Promise<void> {
  void admin;
  void countryCode;
  void catalogName;
  void userIds;
}
