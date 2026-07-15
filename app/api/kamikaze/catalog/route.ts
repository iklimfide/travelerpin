import { NextResponse } from "next/server";
import { getCountryName } from "@/lib/data/countries";
import { TOURIST_CITIES } from "@/lib/data/tourist-cities";
import { TOURIST_PARKS } from "@/lib/data/tourist-parks";
import {
  requireAdminClient,
  requireKamikazeMasterApi,
} from "@/lib/kamikaze/auth";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import {
  getCatalogOverlay,
  popularityOverrideMap,
  revalidateCatalogOverlay,
  type YpCatalogCityRow,
  type YpCatalogExclusionRow,
  type YpCatalogParkRow,
} from "@/lib/kamikaze/catalog-overlay";
import { canonicalCityName } from "@/lib/utils/city-aliases";
import { matchesPlaceNameSearch } from "@/lib/utils/place-search";
import { PARK_TYPES, type ParkType } from "@/types/database";

type CityListRow = {
  name: string;
  countryCode: string;
  countryName: string;
  latitude: number | null;
  longitude: number | null;
  source: "static" | "yp";
  hidden: boolean;
  popular: boolean;
  id?: string;
};

function resolveCityPopular(
  countryCode: string,
  name: string,
  overrides: Map<string, boolean>
): boolean {
  const key = `${countryCode.toUpperCase()}:${catalogNameKey(name, countryCode)}`;
  return overrides.get(key) === true;
}

function dedupeCityListRows(rows: CityListRow[]): CityListRow[] {
  const byKey = new Map<string, CityListRow>();

  for (const row of rows) {
    const code = row.countryCode.toUpperCase();
    const key = `${code}:${catalogNameKey(row.name, code)}`;
    const canonicalName = canonicalCityName(code, row.name);
    const next: CityListRow = { ...row, countryCode: code, name: canonicalName };
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, next);
      continue;
    }

    // Prefer visible YP rows, then non-hidden, then popular.
    const score = (r: CityListRow) =>
      (r.source === "yp" ? 4 : 0) + (r.hidden ? 0 : 2) + (r.popular ? 1 : 0);
    byKey.set(key, score(next) >= score(existing) ? { ...existing, ...next, name: canonicalName } : {
      ...existing,
      name: canonicalName,
      popular: existing.popular || next.popular,
      hidden: existing.hidden && next.hidden,
    });
  }

  return [...byKey.values()];
}

export async function GET(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") === "park" ? "park" : "city";
  const country = searchParams.get("country")?.toUpperCase() ?? "";
  const q = searchParams.get("q")?.trim() ?? "";

  const overlay = await getCatalogOverlay();

  if (kind === "city") {
    const additions = overlay.cities.filter(
      (row) =>
        (!country || row.country_code.toUpperCase() === country) &&
        (q.length < 2 || matchesPlaceNameSearch(row.name, q))
    );

    const exclusions = overlay.exclusions.filter((row) => row.kind === "city");
    const excludedKeys = new Set(
      exclusions.map((row) => {
        const code = row.country_code.toUpperCase();
        return `${code}:${catalogNameKey(row.name_key, code)}`;
      })
    );
    const overrides = popularityOverrideMap(overlay);

    let staticMatches: CityListRow[] = [];

    if (q.length >= 2 || country) {
      staticMatches = TOURIST_CITIES.filter((city) => {
        if (country && city.countryCode !== country) return false;
        if (q.length >= 2 && !matchesPlaceNameSearch(city.name, q)) return false;
        return true;
      })
        .slice(0, 120)
        .map((city) => ({
          name: city.name,
          countryCode: city.countryCode,
          countryName: getCountryName(city.countryCode),
          latitude: city.latitude,
          longitude: city.longitude,
          source: "static" as const,
          hidden: excludedKeys.has(
            `${city.countryCode}:${catalogNameKey(city.name, city.countryCode)}`
          ),
          popular: resolveCityPopular(city.countryCode, city.name, overrides),
        }));
    }

    const additionRows: CityListRow[] = additions.map((row) => ({
      id: row.id,
      name: row.name,
      countryCode: row.country_code,
      countryName: row.country_name,
      latitude: row.latitude,
      longitude: row.longitude,
      source: "yp" as const,
      hidden: excludedKeys.has(
        `${row.country_code.toUpperCase()}:${catalogNameKey(row.name, row.country_code)}`
      ),
      popular: resolveCityPopular(row.country_code, row.name, overrides),
    }));

    return NextResponse.json({
      kind: "city",
      results: dedupeCityListRows([...additionRows, ...staticMatches]).slice(0, 80),
      additions,
      exclusions: exclusions.filter(
        (row) => !country || row.country_code.toUpperCase() === country
      ),
    });
  }

  const additions = overlay.parks.filter(
    (row) =>
      (!country || row.country_code.toUpperCase() === country) &&
      (q.length < 2 || matchesPlaceNameSearch(row.name, q))
  );
  const exclusions = overlay.exclusions.filter((row) => row.kind === "park");
  const excludedKeys = new Set(
    exclusions.map((row) => `${row.country_code.toUpperCase()}:${row.name_key}`)
  );

  let staticMatches: Array<{
    name: string;
    parkType: ParkType;
    countryCode: string;
    countryName: string;
    latitude: number | null;
    longitude: number | null;
    source: "static" | "yp";
    hidden: boolean;
    id?: string;
  }> = [];

  if (q.length >= 2 || country) {
    staticMatches = TOURIST_PARKS.filter((park) => {
      if (country && park.countryCode !== country) return false;
      if (q.length >= 2 && !matchesPlaceNameSearch(park.name, q)) return false;
      return true;
    })
      .slice(0, 80)
      .map((park) => ({
        name: park.name,
        parkType: park.parkType,
        countryCode: park.countryCode,
        countryName: park.countryName,
        latitude: park.latitude,
        longitude: park.longitude,
        source: "static" as const,
        hidden: excludedKeys.has(
          `${park.countryCode}:${catalogNameKey(park.name)}`
        ),
      }));
  }

  const additionRows = additions.map((row) => ({
    id: row.id,
    name: row.name,
    parkType: row.park_type,
    countryCode: row.country_code,
    countryName: row.country_name,
    latitude: row.latitude,
    longitude: row.longitude,
    source: "yp" as const,
    hidden: excludedKeys.has(
      `${row.country_code.toUpperCase()}:${catalogNameKey(row.name)}`
    ),
  }));

  return NextResponse.json({
    kind: "park",
    results: [...additionRows, ...staticMatches],
    additions,
    exclusions: exclusions.filter(
      (row) => !country || row.country_code.toUpperCase() === country
    ),
  });
}

function isBlankCoord(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

function parseOptionalCoords(input: {
  latitude?: number | string | null;
  longitude?: number | string | null;
}): { latitude: number | null; longitude: number | null } | { error: string } {
  const latRaw = input.latitude;
  const lngRaw = input.longitude;
  const latEmpty = isBlankCoord(latRaw);
  const lngEmpty = isBlankCoord(lngRaw);

  if (latEmpty && lngEmpty) {
    return { latitude: null, longitude: null };
  }
  if (latEmpty || lngEmpty) {
    return { error: "Enlem ve boylam birlikte girilmeli veya ikisi de boş bırakılmalı" };
  }

  const latitude = typeof latRaw === "number" ? latRaw : Number(String(latRaw).trim());
  const longitude = typeof lngRaw === "number" ? lngRaw : Number(String(lngRaw).trim());
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { error: "Geçersiz enlem" };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { error: "Geçersiz boylam" };
  }
  return { latitude, longitude };
}

type CatalogBody =
  | {
      action: "add_city";
      name: string;
      countryCode: string;
      latitude?: number | string | null;
      longitude?: number | string | null;
    }
  | {
      action: "add_park";
      name: string;
      countryCode: string;
      parkType: ParkType;
      latitude?: number | string | null;
      longitude?: number | string | null;
    }
  | {
      action: "delete_addition";
      kind: "city" | "park";
      id: string;
    }
  | {
      action: "delete";
      kind: "city" | "park";
      countryCode: string;
      name: string;
      source: "static" | "yp";
      id?: string;
    }
  | {
      action: "delete_bulk";
      kind: "city" | "park";
      items: Array<{
        source: "static" | "yp";
        countryCode: string;
        name: string;
        id?: string;
      }>;
    }
  | {
      action: "rename";
      kind: "city" | "park";
      countryCode: string;
      oldName: string;
      newName: string;
      source: "static" | "yp";
      id?: string;
      latitude?: number | null;
      longitude?: number | null;
      parkType?: ParkType;
    }
  | {
      action: "hide";
      kind: "city" | "park";
      countryCode: string;
      name: string;
    }
  | {
      action: "unhide";
      kind: "city" | "park";
      countryCode: string;
      name: string;
    }
  | {
      action: "unhide_by_id";
      id: string;
    }
  | {
      action: "set_popular";
      countryCode: string;
      name: string;
      isPopular: boolean;
    }
  | {
      action: "set_popular_bulk";
      isPopular: boolean;
      items: Array<{ countryCode: string; name: string }>;
    };

export async function POST(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const adminGate = requireAdminClient();
  if ("response" in adminGate) return adminGate.response;
  const { admin } = adminGate;

  let body: CatalogBody;
  try {
    body = (await request.json()) as CatalogBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "add_city") {
    const name = body.name?.trim();
    const countryCode = body.countryCode?.trim().toUpperCase();
    if (!name || !countryCode || countryCode.length !== 2) {
      return NextResponse.json({ error: "Invalid city payload" }, { status: 400 });
    }
    const coords = parseOptionalCoords(body);
    if ("error" in coords) {
      return NextResponse.json({ error: coords.error }, { status: 400 });
    }

    const row: Omit<YpCatalogCityRow, "id" | "created_at"> = {
      name,
      country_code: countryCode,
      country_name: getCountryName(countryCode),
      latitude: coords.latitude,
      longitude: coords.longitude,
    };

    const { data, error } = await admin
      .from("yp_catalog_cities")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await revalidateCatalogOverlay();
    return NextResponse.json({ city: data });
  }

  if (body.action === "add_park") {
    const name = body.name?.trim();
    const countryCode = body.countryCode?.trim().toUpperCase();
    if (!name || !countryCode || countryCode.length !== 2) {
      return NextResponse.json({ error: "Invalid park payload" }, { status: 400 });
    }
    if (!PARK_TYPES.includes(body.parkType)) {
      return NextResponse.json({ error: "Invalid park type" }, { status: 400 });
    }
    const coords = parseOptionalCoords(body);
    if ("error" in coords) {
      return NextResponse.json({ error: coords.error }, { status: 400 });
    }

    const row: Omit<YpCatalogParkRow, "id" | "created_at"> = {
      name,
      park_type: body.parkType,
      country_code: countryCode,
      country_name: getCountryName(countryCode),
      latitude: coords.latitude,
      longitude: coords.longitude,
    };

    const { data, error } = await admin
      .from("yp_catalog_parks")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await revalidateCatalogOverlay();
    return NextResponse.json({ park: data });
  }

  if (body.action === "delete_addition") {
    const table = body.kind === "city" ? "yp_catalog_cities" : "yp_catalog_parks";
    const { error } = await admin.from(table).delete().eq("id", body.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    await revalidateCatalogOverlay();
    return NextResponse.json({ ok: true });
  }

  async function deleteCatalogItem(input: {
    kind: "city" | "park";
    source: "static" | "yp";
    countryCode: string;
    name: string;
    id?: string;
  }): Promise<string | null> {
    const countryCode = input.countryCode.trim().toUpperCase();
    const name = input.name.trim();
    if (!countryCode || !name) return "Geçersiz silme isteği";

    if (input.source === "yp") {
      if (!input.id) return "YP kaydı id gerekli";
      const table = input.kind === "city" ? "yp_catalog_cities" : "yp_catalog_parks";
      const { error } = await admin.from(table).delete().eq("id", input.id);
      return error?.message ?? null;
    }

    const { error: insertError } = await admin.from("yp_catalog_exclusions").insert({
      kind: input.kind,
      country_code: countryCode,
      name_key: catalogNameKey(
        name,
        input.kind === "city" ? countryCode : undefined
      ),
    });
    if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
      return insertError.message;
    }
    return null;
  }

  if (body.action === "delete") {
    const err = await deleteCatalogItem({
      kind: body.kind,
      source: body.source,
      countryCode: body.countryCode,
      name: body.name,
      id: body.id,
    });
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
    await revalidateCatalogOverlay();
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete_bulk") {
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "Silinecek kayıt seçilmedi" }, { status: 400 });
    }
    if (items.length > 200) {
      return NextResponse.json({ error: "En fazla 200 kayıt silinebilir" }, { status: 400 });
    }

    const errors: string[] = [];
    for (const item of items) {
      const err = await deleteCatalogItem({
        kind: body.kind,
        source: item.source,
        countryCode: item.countryCode,
        name: item.name,
        id: item.id,
      });
      if (err) errors.push(`${item.name}: ${err}`);
    }

    await revalidateCatalogOverlay();
    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.slice(0, 5).join("; "), failed: errors.length },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, deleted: items.length });
  }

  if (body.action === "rename") {
    const countryCode = body.countryCode?.trim().toUpperCase();
    const oldName = body.oldName?.trim();
    const newName = body.newName?.trim();
    if (!countryCode || !oldName || !newName) {
      return NextResponse.json({ error: "Eski ve yeni ad gerekli" }, { status: 400 });
    }
    if (oldName === newName) {
      return NextResponse.json({ error: "Yeni ad eskisiyle aynı" }, { status: 400 });
    }

    const oldKey = catalogNameKey(
      oldName,
      body.kind === "city" ? countryCode : undefined
    );
    const newKey = catalogNameKey(
      newName,
      body.kind === "city" ? countryCode : undefined
    );

    if (body.source === "yp") {
      if (!body.id) {
        return NextResponse.json({ error: "YP kaydı id gerekli" }, { status: 400 });
      }
      const table = body.kind === "city" ? "yp_catalog_cities" : "yp_catalog_parks";
      const { error } = await admin.from(table).update({ name: newName }).eq("id", body.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      // Drop exclusion that might block the new display name from a prior rename attempt.
      await admin
        .from("yp_catalog_exclusions")
        .delete()
        .eq("kind", body.kind)
        .eq("country_code", countryCode)
        .eq("name_key", newKey);
    } else {
      // Hide the static (or previous) name from the live catalog.
      const { error: hideError } = await admin.from("yp_catalog_exclusions").insert({
        kind: body.kind,
        country_code: countryCode,
        name_key: oldKey,
      });
      if (hideError && !hideError.message.toLowerCase().includes("duplicate")) {
        return NextResponse.json({ error: hideError.message }, { status: 400 });
      }

      const newNameAlreadyInStatic =
        body.kind === "city"
          ? TOURIST_CITIES.some(
              (city) =>
                city.countryCode === countryCode &&
                catalogNameKey(city.name, countryCode) === newKey
            )
          : TOURIST_PARKS.some(
              (park) =>
                park.countryCode === countryCode && catalogNameKey(park.name) === newKey
            );

      const ypTable = body.kind === "city" ? "yp_catalog_cities" : "yp_catalog_parks";
      const { data: existingYpRows } = await admin
        .from(ypTable)
        .select("id, name")
        .eq("country_code", countryCode);

      const existingYp = (existingYpRows ?? []).find(
        (row) =>
          catalogNameKey(
            String(row.name),
            body.kind === "city" ? countryCode : undefined
          ) === newKey
      );

      // Target name already lives in the catalog — just hide the old one.
      if (newNameAlreadyInStatic || existingYp) {
        await admin
          .from("yp_catalog_exclusions")
          .delete()
          .eq("kind", body.kind)
          .eq("country_code", countryCode)
          .eq("name_key", newKey);
        await revalidateCatalogOverlay();
        return NextResponse.json({ ok: true, mode: "alias" });
      }

      const coords = parseOptionalCoords({
        latitude: body.latitude,
        longitude: body.longitude,
      });
      if ("error" in coords) {
        return NextResponse.json({ error: coords.error }, { status: 400 });
      }

      if (body.kind === "city") {
        const { error } = await admin.from("yp_catalog_cities").insert({
          name: newName,
          country_code: countryCode,
          country_name: getCountryName(countryCode),
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        if (error && !error.message.toLowerCase().includes("duplicate")) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      } else {
        const parkType = body.parkType;
        if (!parkType || !PARK_TYPES.includes(parkType)) {
          return NextResponse.json({ error: "Park türü gerekli" }, { status: 400 });
        }
        const { error } = await admin.from("yp_catalog_parks").insert({
          name: newName,
          park_type: parkType,
          country_code: countryCode,
          country_name: getCountryName(countryCode),
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        if (error && !error.message.toLowerCase().includes("duplicate")) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      }

      // New name must be visible (undo accidental exclusion).
      await admin
        .from("yp_catalog_exclusions")
        .delete()
        .eq("kind", body.kind)
        .eq("country_code", countryCode)
        .eq("name_key", newKey);
    }

    await revalidateCatalogOverlay();
    return NextResponse.json({ ok: true });
  }

  if (body.action === "hide") {
    const countryCode = body.countryCode?.trim().toUpperCase();
    const name = body.name?.trim();
    if (!countryCode || !name) {
      return NextResponse.json({ error: "Invalid hide payload" }, { status: 400 });
    }

    const exclusion: Omit<YpCatalogExclusionRow, "id" | "created_at"> = {
      kind: body.kind,
      country_code: countryCode,
      name_key: catalogNameKey(
        name,
        body.kind === "city" ? countryCode : undefined
      ),
    };

    const { error } = await admin.from("yp_catalog_exclusions").insert(exclusion);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    await revalidateCatalogOverlay();
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unhide") {
    const countryCode = body.countryCode?.trim().toUpperCase();
    const name = body.name?.trim();
    if (!countryCode || !name) {
      return NextResponse.json({ error: "Invalid unhide payload" }, { status: 400 });
    }

    const nameKey = catalogNameKey(
      name,
      body.kind === "city" ? countryCode : undefined
    );
    const { error } = await admin
      .from("yp_catalog_exclusions")
      .delete()
      .eq("kind", body.kind)
      .eq("country_code", countryCode)
      .eq("name_key", nameKey);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    await revalidateCatalogOverlay();
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unhide_by_id") {
    const { error } = await admin
      .from("yp_catalog_exclusions")
      .delete()
      .eq("id", body.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    await revalidateCatalogOverlay();
    return NextResponse.json({ ok: true });
  }

  async function upsertCityPopular(
    countryCodeRaw: string,
    nameRaw: string,
    isPopular: boolean
  ): Promise<string | null> {
    const countryCode = countryCodeRaw.trim().toUpperCase();
    const name = nameRaw.trim();
    if (!countryCode || countryCode.length !== 2 || !name) {
      return "Geçersiz popüler isteği";
    }

    const nameKey = catalogNameKey(name, countryCode);
    const { data: existing } = await admin
      .from("yp_city_popularity")
      .select("id")
      .eq("country_code", countryCode)
      .eq("name_key", nameKey)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await admin
        .from("yp_city_popularity")
        .update({
          is_popular: isPopular,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      return error?.message ?? null;
    }

    const { error } = await admin.from("yp_city_popularity").insert({
      country_code: countryCode,
      name_key: nameKey,
      is_popular: isPopular,
    });
    if (!error) return null;

    const { error: retryError } = await admin
      .from("yp_city_popularity")
      .update({
        is_popular: isPopular,
        updated_at: new Date().toISOString(),
      })
      .eq("country_code", countryCode)
      .eq("name_key", nameKey);
    return retryError?.message ?? error.message;
  }

  if (body.action === "set_popular") {
    const err = await upsertCityPopular(
      body.countryCode,
      body.name,
      Boolean(body.isPopular)
    );
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
    await revalidateCatalogOverlay();
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_popular_bulk") {
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "Kayıt seçilmedi" }, { status: 400 });
    }
    if (items.length > 200) {
      return NextResponse.json({ error: "En fazla 200 kayıt" }, { status: 400 });
    }

    const isPopular = Boolean(body.isPopular);
    const errors: string[] = [];
    for (const item of items) {
      const err = await upsertCityPopular(item.countryCode, item.name, isPopular);
      if (err) errors.push(`${item.name}: ${err}`);
    }

    await revalidateCatalogOverlay();
    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.slice(0, 5).join("; "), failed: errors.length },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, updated: items.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
