import type { SupabaseClient } from "@supabase/supabase-js";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import { revalidateCatalogOverlay, type YpCatalogCityRow } from "@/lib/kamikaze/catalog-overlay";
import { getCountryName } from "@/lib/data/countries";
import { canonicalCityName } from "@/lib/utils/city-aliases";
import { formatCityDisplayName } from "@/lib/utils/city-name";

export type EnsureYpCatalogCityInput = {
  city_name: string;
  country_code: string;
  country_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/** Idempotent: IG/hashtag import şehirleri YP Şehirler listesinde görünsün diye yp_catalog_cities'e yazar. */
export async function ensureYpCatalogCity(
  admin: SupabaseClient,
  input: EnsureYpCatalogCityInput
): Promise<{ created: boolean; city: YpCatalogCityRow | null }> {
  const countryCode = input.country_code.trim().toUpperCase();
  const name = formatCityDisplayName(
    canonicalCityName(countryCode, input.city_name.trim())
  );
  if (!name || countryCode.length !== 2) {
    return { created: false, city: null };
  }

  const nameKey = catalogNameKey(name, countryCode);
  const countryName =
    input.country_name?.trim() || getCountryName(countryCode, "en") || countryCode;

  await admin
    .from("yp_catalog_exclusions")
    .delete()
    .eq("kind", "city")
    .eq("country_code", countryCode)
    .eq("name_key", nameKey);

  const { data: existingRows, error: readError } = await admin
    .from("yp_catalog_cities")
    .select("*")
    .eq("country_code", countryCode);

  if (readError) {
    throw new Error(readError.message);
  }

  const existing = (existingRows as YpCatalogCityRow[] | null)?.find(
    (row) => catalogNameKey(row.name, countryCode) === nameKey
  );

  if (existing) {
    const lat =
      typeof input.latitude === "number" && Number.isFinite(input.latitude)
        ? input.latitude
        : null;
    const lon =
      typeof input.longitude === "number" && Number.isFinite(input.longitude)
        ? input.longitude
        : null;

    if ((lat != null || lon != null) && existing.latitude == null && existing.longitude == null) {
      const { data: updated, error: updateError } = await admin
        .from("yp_catalog_cities")
        .update({
          latitude: lat ?? existing.latitude,
          longitude: lon ?? existing.longitude,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (updateError) throw new Error(updateError.message);
      await revalidateCatalogOverlay();
      return { created: false, city: updated as YpCatalogCityRow };
    }

    return { created: false, city: existing };
  }

  const lat =
    typeof input.latitude === "number" && Number.isFinite(input.latitude)
      ? input.latitude
      : null;
  const lon =
    typeof input.longitude === "number" && Number.isFinite(input.longitude)
      ? input.longitude
      : null;

  const { data, error } = await admin
    .from("yp_catalog_cities")
    .insert({
      name,
      country_code: countryCode,
      country_name: countryName,
      latitude: lat,
      longitude: lon,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await revalidateCatalogOverlay();
  return { created: true, city: data as YpCatalogCityRow };
}

/** Allowlist profillerindeki tüm visited_cities satırlarını kataloga yansıt. */
export async function syncYpCatalogCitiesFromProfilePins(
  admin: SupabaseClient,
  userId: string
): Promise<{ ensured: number; created: number }> {
  const { data, error } = await admin
    .from("visited_cities")
    .select("city_name, country_code, country_name, latitude, longitude")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  let ensured = 0;
  let created = 0;

  for (const row of data ?? []) {
    if (!row.city_name?.trim() || !row.country_code?.trim()) continue;
    const result = await ensureYpCatalogCity(admin, {
      city_name: row.city_name,
      country_code: row.country_code,
      country_name: row.country_name,
      latitude: row.latitude,
      longitude: row.longitude,
    });
    ensured += 1;
    if (result.created) created += 1;
  }

  return { ensured, created };
}
