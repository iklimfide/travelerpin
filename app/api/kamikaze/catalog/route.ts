import { NextResponse } from "next/server";
import { getCountryCapitalName, matchesCapitalCity } from "@/lib/data/country-capitals";
import {
  clearCountryListCache,
  getCountryList,
  getCountryName,
} from "@/lib/data/countries";
import { writeYpCountryNameTrFile } from "@/lib/data/country-name-tr-yp-server";
import { TOURIST_CITIES } from "@/lib/data/tourist-cities";
import { TOURIST_PARKS } from "@/lib/data/tourist-parks";
import {
  requireAdminClient,
  requireKamikazeMasterApi,
} from "@/lib/kamikaze/auth";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import {
  getCatalogOverlay,
  getCatalogOverlayFresh,
  popularityOverrideMap,
  cityNameTrOverrideMap,
  countryNameTrOverrideMap,
  revalidateCatalogOverlay,
  type YpCatalogCityRow,
  type YpCatalogParkRow,
} from "@/lib/kamikaze/catalog-overlay";
import { canonicalCityName } from "@/lib/utils/city-aliases";
import { resolveCityNameTr } from "@/lib/i18n/place-names";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { matchesPlaceNameSearch } from "@/lib/utils/place-search";
import { PARK_TYPES, type ParkType } from "@/types/database";

type CityListRow = {
  name: string;
  nameTr: string | null;
  countryCode: string;
  countryName: string;
  latitude: number | null;
  longitude: number | null;
  source: "static" | "yp";
  popular: boolean;
  capital: boolean;
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

function resolveCityCapital(countryCode: string, name: string): boolean {
  const capitalName = getCountryCapitalName(countryCode);
  return capitalName ? matchesCapitalCity(name, capitalName) : false;
}

/** Prefer YP DB override, else curated place-names catalog when it differs from EN. */
function resolveCityNameTrForCatalog(
  countryCode: string,
  name: string,
  overrides: Map<string, string>
): string | null {
  return resolveCityNameTr(countryCode, name, overrides);
}

type CountryListRow = {
  name: string;
  nameTr: string | null;
  countryCode: string;
  countryName: string;
  latitude: null;
  longitude: null;
  source: "static";
  trSource: "db" | "static" | "iso";
};

function resolveCountryListNameTr(
  countryCode: string,
  nameEn: string,
  overrides: Map<string, string>
): Pick<CountryListRow, "nameTr" | "trSource"> {
  const code = countryCode.toUpperCase();
  const fromDb = overrides.get(code);
  if (fromDb) return { nameTr: fromDb, trSource: "db" };
  const tr = getCountryName(code, "tr");
  if (tr && tr !== nameEn) return { nameTr: tr, trSource: "static" };
  return { nameTr: null, trSource: "iso" };
}

function isMissingRelationError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("schema cache") ||
    lower.includes("could not find the table")
  );
}

function withCityNameTr(
  row: Omit<CityListRow, "nameTr">,
  overrides: Map<string, string>
): CityListRow {
  return {
    ...row,
    nameTr: resolveCityNameTrForCatalog(row.countryCode, row.name, overrides),
  };
}

function cityNameMatchesSearch(
  countryCode: string,
  name: string,
  q: string,
  nameTrOverrides: Map<string, string>
): boolean {
  if (q.length < 2) return true;
  if (matchesPlaceNameSearch(name, q)) return true;
  const nameTr = resolveCityNameTrForCatalog(countryCode, name, nameTrOverrides);
  return nameTr ? matchesPlaceNameSearch(nameTr, q) : false;
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

    // Prefer YP rows, then popular.
    const score = (r: CityListRow) => (r.source === "yp" ? 2 : 0) + (r.popular ? 1 : 0);
    byKey.set(
      key,
      score(next) >= score(existing)
        ? {
            ...existing,
            ...next,
            name: canonicalName,
            capital: existing.capital || next.capital,
            popular: existing.popular || next.popular,
          }
        : {
            ...existing,
            name: canonicalName,
            popular: existing.popular || next.popular,
            capital: existing.capital || next.capital,
          }
    );
  }

  return [...byKey.values()];
}

function sortCityListRows(rows: CityListRow[]): CityListRow[] {
  return [...rows].sort((a, b) => {
    if (a.popular !== b.popular) return a.popular ? -1 : 1;
    if (a.capital !== b.capital) return a.capital ? -1 : 1;
    return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
  });
}

function applyPopularFilter(
  rows: CityListRow[],
  filter: "popular" | "not_popular" | null
): CityListRow[] {
  if (filter === "popular") return rows.filter((row) => row.popular);
  if (filter === "not_popular") return rows.filter((row) => !row.popular);
  return rows;
}

function buildPopularOnlyCityRows(
  overlay: Awaited<ReturnType<typeof getCatalogOverlay>>,
  excludedKeys: Set<string>,
  overrides: Map<string, boolean>,
  nameTrOverrides: Map<string, string>,
  country: string,
  q: string
): CityListRow[] {
  const rows: Array<Omit<CityListRow, "nameTr">> = [];

  for (const [key, isPopular] of overrides) {
    if (!isPopular) continue;

    const sep = key.indexOf(":");
    if (sep < 0) continue;

    const code = key.slice(0, sep);
    const nameKey = key.slice(sep + 1);
    if (country && code !== country) continue;

    const ypMatch = overlay.cities.find(
      (city) =>
        city.country_code.toUpperCase() === code &&
        catalogNameKey(city.name, code) === nameKey
    );
    if (ypMatch) {
      const name = canonicalCityName(code, ypMatch.name);
      if (!cityNameMatchesSearch(code, name, q, nameTrOverrides)) continue;
      rows.push({
        id: ypMatch.id,
        name,
        countryCode: code,
        countryName: ypMatch.country_name,
        latitude: ypMatch.latitude,
        longitude: ypMatch.longitude,
        source: "yp",
        popular: true,
        capital: resolveCityCapital(code, ypMatch.name),
      });
      continue;
    }

    if (excludedKeys.has(`${code}:${nameKey}`)) continue;

    const staticMatch = TOURIST_CITIES.find(
      (city) =>
        city.countryCode.toUpperCase() === code &&
        catalogNameKey(city.name, city.countryCode) === nameKey
    );
    if (!staticMatch) continue;
    const name = canonicalCityName(code, staticMatch.name);
    if (!cityNameMatchesSearch(code, name, q, nameTrOverrides)) continue;

    rows.push({
      name,
      countryCode: code,
      countryName: getCountryName(code),
      latitude: staticMatch.latitude,
      longitude: staticMatch.longitude,
      source: "static",
      popular: true,
      capital: resolveCityCapital(code, staticMatch.name),
    });
  }

  return dedupeCityListRows(rows.map((row) => withCityNameTr(row, nameTrOverrides)));
}

export async function GET(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const { searchParams } = new URL(request.url);
  const kindParam = searchParams.get("kind");
  const q = searchParams.get("q")?.trim() ?? "";

  if (kindParam === "country") {
    const overlay = await getCatalogOverlayFresh();
    const overrides = countryNameTrOverrideMap(overlay);
    const offsetRaw = Number(searchParams.get("offset") ?? "0");
    const limitRaw = Number(searchParams.get("limit") ?? "80");
    const offset =
      Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
    const limit = Number.isFinite(limitRaw)
      ? Math.min(200, Math.max(1, Math.floor(limitRaw)))
      : 80;

    const all: CountryListRow[] = getCountryList("en").map((country) => {
      const { nameTr, trSource } = resolveCountryListNameTr(
        country.code,
        country.name,
        overrides
      );
      return {
        name: country.name,
        nameTr,
        countryCode: country.code,
        countryName: country.name,
        latitude: null,
        longitude: null,
        source: "static" as const,
        trSource,
      };
    });

    const filtered =
      q.length < 2
        ? all
        : all.filter((row) => {
            const haystack = `${row.countryCode} ${row.name} ${row.nameTr ?? ""}`;
            return matchesPlaceNameSearch(haystack, q);
          });

    const page = filtered.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    return NextResponse.json({
      kind: "country",
      results: page,
      total: filtered.length,
      hasMore: nextOffset < filtered.length,
      nextOffset,
    });
  }

  const kind = kindParam === "park" ? "park" : "city";
  const country = searchParams.get("country")?.toUpperCase() ?? "";
  const popularFilterRaw = searchParams.get("popularFilter");
  const popularFilter =
    popularFilterRaw === "popular" || popularFilterRaw === "not_popular"
      ? popularFilterRaw
      : null;

  // YP additions only (newest first) — used by Şehir ekle / Park ekle tabs.
  // Do not hide YP rows via exclusions: exclusions only suppress static catalog
  // twins. Filtering YP here created "ghost" rows (in DB, invisible in UI, blocks insert).
  if (searchParams.get("ypOnly") === "1") {
    const overlayFresh = await getCatalogOverlayFresh();

    if (kind === "city") {
      const overrides = popularityOverrideMap(overlayFresh);
      const nameTrOverrides = cityNameTrOverrideMap(overlayFresh);
      const results = overlayFresh.cities.map((row) =>
        withCityNameTr(
          {
            id: row.id,
            name: row.name,
            countryCode: row.country_code.toUpperCase(),
            countryName: row.country_name,
            latitude: row.latitude,
            longitude: row.longitude,
            source: "yp" as const,
            popular: resolveCityPopular(row.country_code, row.name, overrides),
            capital: resolveCityCapital(row.country_code, row.name),
          },
          nameTrOverrides
        )
      );
      // overlay.cities is already created_at desc.
      return NextResponse.json({ kind: "city", results, ypOnly: true });
    }

    const results = overlayFresh.parks.map((row) => ({
      id: row.id,
      name: row.name,
      parkType: row.park_type,
      countryCode: row.country_code.toUpperCase(),
      countryName: row.country_name,
      latitude: row.latitude,
      longitude: row.longitude,
      source: "yp" as const,
      createdAt: row.created_at,
    }));
    return NextResponse.json({ kind: "park", results, ypOnly: true });
  }

  const overlay = await getCatalogOverlay();
  const offsetRaw = Number(searchParams.get("offset") ?? "0");
  const limitRaw = Number(searchParams.get("limit") ?? "80");
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(200, Math.max(1, Math.floor(limitRaw)))
    : 80;

  if (kind === "city") {
    const excludedKeys = new Set(
      overlay.exclusions
        .filter((row) => row.kind === "city")
        .map((row) => {
          const code = row.country_code.toUpperCase();
          return `${code}:${catalogNameKey(row.name_key, code)}`;
        })
    );
    const overrides = popularityOverrideMap(overlay);
    const nameTrOverrides = cityNameTrOverrideMap(overlay);

    const popularOnlyBrowse =
      popularFilter === "popular" && !country && q.length < 2;

    if (popularOnlyBrowse) {
      const all = sortCityListRows(
        buildPopularOnlyCityRows(
          overlay,
          excludedKeys,
          overrides,
          nameTrOverrides,
          country,
          q
        )
      );
      const page = all.slice(offset, offset + limit);
      const nextOffset = offset + page.length;

      return NextResponse.json({
        kind: "city",
        results: page,
        total: all.length,
        hasMore: nextOffset < all.length,
        nextOffset,
        popularFilter,
      });
    }

    // YP additions always listed when they match filters (even if an exclusion
    // remnant exists — that remnant only affects static twins).
    const additions = overlay.cities.filter((row) => {
      const code = row.country_code.toUpperCase();
      if (country && code !== country) return false;
      if (!cityNameMatchesSearch(code, row.name, q, nameTrOverrides)) return false;
      return true;
    });

    let staticMatches: Array<Omit<CityListRow, "nameTr">> = [];

    if (q.length >= 2 || country) {
      staticMatches = TOURIST_CITIES.filter((city) => {
        if (
          excludedKeys.has(
            `${city.countryCode}:${catalogNameKey(city.name, city.countryCode)}`
          )
        ) {
          return false;
        }
        if (country && city.countryCode !== country) return false;
        if (!cityNameMatchesSearch(city.countryCode, city.name, q, nameTrOverrides)) {
          return false;
        }
        return true;
      }).map((city) => ({
        name: city.name,
        countryCode: city.countryCode,
        countryName: getCountryName(city.countryCode),
        latitude: city.latitude,
        longitude: city.longitude,
        source: "static" as const,
        popular: resolveCityPopular(city.countryCode, city.name, overrides),
        capital: resolveCityCapital(city.countryCode, city.name),
      }));
    }

    const additionRows: Array<Omit<CityListRow, "nameTr">> = additions.map((row) => ({
      id: row.id,
      name: row.name,
      countryCode: row.country_code,
      countryName: row.country_name,
      latitude: row.latitude,
      longitude: row.longitude,
      source: "yp" as const,
      popular: resolveCityPopular(row.country_code, row.name, overrides),
      capital: resolveCityCapital(row.country_code, row.name),
    }));

    const all = sortCityListRows(
      applyPopularFilter(
        dedupeCityListRows(
          [...additionRows, ...staticMatches].map((row) =>
            withCityNameTr(row, nameTrOverrides)
          )
        ),
        popularFilter
      )
    );
    const page = all.slice(offset, offset + limit);
    const nextOffset = offset + page.length;

    return NextResponse.json({
      kind: "city",
      results: page,
      additions,
      total: all.length,
      hasMore: nextOffset < all.length,
      nextOffset,
      popularFilter,
    });
  }

  const excludedKeys = new Set(
    overlay.exclusions
      .filter((row) => row.kind === "park")
      .map((row) => `${row.country_code.toUpperCase()}:${row.name_key}`)
  );

  const additions = overlay.parks.filter((row) => {
    const code = row.country_code.toUpperCase();
    if (country && code !== country) return false;
    if (q.length >= 2 && !matchesPlaceNameSearch(row.name, q)) return false;
    return true;
  });

  let staticMatches: Array<{
    name: string;
    parkType: ParkType;
    countryCode: string;
    countryName: string;
    latitude: number | null;
    longitude: number | null;
    source: "static" | "yp";
    id?: string;
  }> = [];

  if (q.length >= 2 || country) {
    staticMatches = TOURIST_PARKS.filter((park) => {
      if (excludedKeys.has(`${park.countryCode}:${catalogNameKey(park.name)}`)) {
        return false;
      }
      if (country && park.countryCode !== country) return false;
      if (q.length >= 2 && !matchesPlaceNameSearch(park.name, q)) return false;
      return true;
    }).map((park) => ({
      name: park.name,
      parkType: park.parkType,
      countryCode: park.countryCode,
      countryName: park.countryName,
      latitude: park.latitude,
      longitude: park.longitude,
      source: "static" as const,
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
  }));

  const all = [...additionRows, ...staticMatches];
  const page = all.slice(offset, offset + limit);
  const nextOffset = offset + page.length;

  return NextResponse.json({
    kind: "park",
    results: page,
    additions,
    total: all.length,
    hasMore: nextOffset < all.length,
    nextOffset,
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
      nameTr?: string | null;
      countryCode: string;
      latitude?: number | string | null;
      longitude?: number | string | null;
      isPopular?: boolean;
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
      nameTr?: string | null;
      source: "static" | "yp";
      id?: string;
      latitude?: number | null;
      longitude?: number | null;
      parkType?: ParkType;
    }
  | {
      action: "set_name_tr";
      countryCode: string;
      name: string;
      nameTr: string | null;
    }
  | {
      action: "set_country_name_tr";
      countryCode: string;
      nameTr: string | null;
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
    const name = formatCityDisplayName(body.name ?? "");
    const nameTr = body.nameTr?.trim() ? formatCityDisplayName(body.nameTr) : null;
    const countryCode = body.countryCode?.trim().toUpperCase();
    if (!name || !countryCode || countryCode.length !== 2) {
      return NextResponse.json({ error: "Invalid city payload" }, { status: 400 });
    }
    const coords = parseOptionalCoords(body);
    if ("error" in coords) {
      return NextResponse.json({ error: coords.error }, { status: 400 });
    }

    const nameKey = catalogNameKey(name, countryCode);

    // Clear exclusion remnants first so a healed/existing row becomes visible.
    await admin
      .from("yp_catalog_exclusions")
      .delete()
      .eq("kind", "city")
      .eq("country_code", countryCode)
      .eq("name_key", nameKey);

    const { data: existingRows } = await admin
      .from("yp_catalog_cities")
      .select("*")
      .eq("country_code", countryCode);

    let existing = (existingRows as YpCatalogCityRow[] | null)?.find(
      (row) => catalogNameKey(row.name, countryCode) === nameKey
    );

    if (existing) {
      // Fix legacy lowercase display names ("hua hin" → "Hua Hin").
      if (existing.name !== name) {
        const { data: updated, error: updateError } = await admin
          .from("yp_catalog_cities")
          .update({ name })
          .eq("id", existing.id)
          .select("*")
          .single();
        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 400 });
        }
        existing = updated as YpCatalogCityRow;
      }

      if (body.isPopular) {
        const popularError = await upsertCityPopular(countryCode, existing.name, true);
        if (popularError) {
          return NextResponse.json(
            { error: popularError, city: existing },
            { status: 400 }
          );
        }
      }
      if (nameTr) {
        const trError = await upsertCityNameTr(countryCode, existing.name, nameTr);
        if (trError) {
          return NextResponse.json({ error: trError, city: existing }, { status: 400 });
        }
      }
      await revalidateCatalogOverlay();
      return NextResponse.json({ city: existing, alreadyExisted: true });
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
      const msg = error.message.toLowerCase();
      if (
        msg.includes("yp_catalog_cities_country_name_uidx") ||
        msg.includes("duplicate key")
      ) {
        // Race / case-fold miss: surface existing row instead of raw Postgres error.
        const { data: again } = await admin
          .from("yp_catalog_cities")
          .select("*")
          .eq("country_code", countryCode);
        const found = (again as YpCatalogCityRow[] | null)?.find(
          (r) => catalogNameKey(r.name, countryCode) === nameKey
        );
        if (found) {
          if (nameTr) {
            await upsertCityNameTr(countryCode, found.name, nameTr);
          }
          await revalidateCatalogOverlay();
          return NextResponse.json({ city: found, alreadyExisted: true });
        }
        return NextResponse.json(
          {
            error:
              "Bu şehir bu ülkede zaten YP kataloğunda. Eklenen şehirler listesinden silip tekrar dene.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (body.isPopular) {
      const popularError = await upsertCityPopular(countryCode, name, true);
      if (popularError) {
        return NextResponse.json(
          { error: popularError, city: data },
          { status: 400 }
        );
      }
    }

    if (nameTr) {
      const trError = await upsertCityNameTr(countryCode, name, nameTr);
      if (trError) {
        return NextResponse.json({ error: trError, city: data }, { status: 400 });
      }
    }

    await revalidateCatalogOverlay();
    return NextResponse.json({ city: data });
  }

  if (body.action === "add_park") {
    const name = formatCityDisplayName(body.name ?? "");
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

    await admin
      .from("yp_catalog_exclusions")
      .delete()
      .eq("kind", "park")
      .eq("country_code", countryCode)
      .eq("name_key", catalogNameKey(name));

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

    const nameKey = catalogNameKey(
      name,
      input.kind === "city" ? countryCode : undefined
    );

    // YP rows are hard-deleted from the DB.
    if (input.source === "yp") {
      if (!input.id) return "YP kaydı id gerekli";
      const table = input.kind === "city" ? "yp_catalog_cities" : "yp_catalog_parks";
      const { error, count } = await admin
        .from(table)
        .delete({ count: "exact" })
        .eq("id", input.id);
      if (error) return error.message;

      // Id miss (stale UI): also drop any same country+name remnant.
      if (!count) {
        const { data: remnants } = await admin
          .from(table)
          .select("id, name, country_code");
        const matches = (remnants ?? []).filter((row) => {
          const code = String(row.country_code ?? "").toUpperCase();
          if (code !== countryCode) return false;
          const rowKey = catalogNameKey(
            String(row.name ?? ""),
            input.kind === "city" ? countryCode : undefined
          );
          return rowKey === nameKey;
        });
        for (const row of matches) {
          await admin.from(table).delete().eq("id", row.id);
        }
      }

      // Exclusion only needed when a static twin would otherwise reappear.
      const hasStaticTwin =
        input.kind === "city"
          ? TOURIST_CITIES.some(
              (city) =>
                city.countryCode === countryCode &&
                catalogNameKey(city.name, countryCode) === nameKey
            )
          : TOURIST_PARKS.some(
              (park) =>
                park.countryCode === countryCode &&
                catalogNameKey(park.name) === nameKey
            );

      if (!hasStaticTwin) {
        // YP-only place: drop any leftover exclusion so re-add is clean.
        await admin
          .from("yp_catalog_exclusions")
          .delete()
          .eq("kind", input.kind)
          .eq("country_code", countryCode)
          .eq("name_key", nameKey);
        return null;
      }
    }

    // Permanent catalog removal (blocks a static twin from reappearing).
    const { error: insertError } = await admin.from("yp_catalog_exclusions").insert({
      kind: input.kind,
      country_code: countryCode,
      name_key: nameKey,
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
    const newName = formatCityDisplayName(body.newName ?? "");
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

    if (body.kind === "city") {
      if (oldKey !== newKey) {
        // Move TR label to the new EN key when the English name changes.
        const { data: oldTr } = await admin
          .from("yp_city_name_tr")
          .select("name_tr")
          .eq("country_code", countryCode)
          .eq("name_key", oldKey)
          .maybeSingle();
        if (oldTr?.name_tr) {
          await admin
            .from("yp_city_name_tr")
            .delete()
            .eq("country_code", countryCode)
            .eq("name_key", oldKey);
          if (body.nameTr === undefined) {
            await upsertCityNameTr(countryCode, newName, String(oldTr.name_tr));
          }
        }
      }
      if (body.nameTr !== undefined) {
        const trError = await upsertCityNameTr(
          countryCode,
          newName,
          body.nameTr?.trim() ? body.nameTr : null
        );
        if (trError) {
          return NextResponse.json({ error: trError }, { status: 400 });
        }
      }
    }

    await revalidateCatalogOverlay();
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_name_tr") {
    const countryCode = body.countryCode?.trim().toUpperCase();
    const name = body.name?.trim();
    if (!countryCode || countryCode.length !== 2 || !name) {
      return NextResponse.json({ error: "Ülke ve şehir adı gerekli" }, { status: 400 });
    }
    const trError = await upsertCityNameTr(
      countryCode,
      name,
      body.nameTr?.trim() ? body.nameTr : null
    );
    if (trError) {
      return NextResponse.json({ error: trError }, { status: 400 });
    }
    await revalidateCatalogOverlay();
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_country_name_tr") {
    const countryCode = body.countryCode?.trim().toUpperCase();
    if (!countryCode || countryCode.length !== 2) {
      return NextResponse.json({ error: "Ülke kodu gerekli" }, { status: 400 });
    }
    const trError = await upsertCountryNameTr(
      countryCode,
      body.nameTr?.trim() ? body.nameTr : null
    );
    if (trError) {
      return NextResponse.json({ error: trError }, { status: 400 });
    }
    await revalidateCatalogOverlay();
    return NextResponse.json({ ok: true });
  }

  async function syncYpCountryNameTrFile(): Promise<string | null> {
    const { data, error } = await admin
      .from("yp_country_name_tr")
      .select("country_code, name_tr")
      .order("country_code", { ascending: true });
    if (error) {
      if (isMissingRelationError(error.message)) {
        return "yp_country_name_tr tablosu yok — migration 036 uygulanmalı";
      }
      return error.message;
    }
    try {
      await writeYpCountryNameTrFile(
        (data ?? []) as Array<{ country_code: string; name_tr: string }>
      );
      clearCountryListCache();
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Ülke TR dosyası yazılamadı";
    }
  }

  async function upsertCountryNameTr(
    countryCodeRaw: string,
    nameTrRaw: string | null
  ): Promise<string | null> {
    const countryCode = countryCodeRaw.trim().toUpperCase();
    if (!countryCode || countryCode.length !== 2) {
      return "Geçersiz ülke kodu";
    }

    const nameTr = nameTrRaw?.trim() ?? "";

    if (!nameTr) {
      const { error } = await admin
        .from("yp_country_name_tr")
        .delete()
        .eq("country_code", countryCode);
      if (error && isMissingRelationError(error.message)) {
        return "yp_country_name_tr tablosu yok — migration 036 uygulanmalı";
      }
      if (error) return error.message;
      return syncYpCountryNameTrFile();
    }

    const displayTr = formatCityDisplayName(nameTr);
    const now = new Date().toISOString();
    const { data: existing } = await admin
      .from("yp_country_name_tr")
      .select("id")
      .eq("country_code", countryCode)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await admin
        .from("yp_country_name_tr")
        .update({ name_tr: displayTr, updated_at: now })
        .eq("id", existing.id);
      if (error && isMissingRelationError(error.message)) {
        return "yp_country_name_tr tablosu yok — migration 036 uygulanmalı";
      }
      if (error) return error.message;
      return syncYpCountryNameTrFile();
    }

    const { error } = await admin.from("yp_country_name_tr").insert({
      country_code: countryCode,
      name_tr: displayTr,
      updated_at: now,
    });
    if (error && isMissingRelationError(error.message)) {
      return "yp_country_name_tr tablosu yok — migration 036 uygulanmalı";
    }
    if (error) return error.message;
    return syncYpCountryNameTrFile();
  }

  async function upsertCityNameTr(
    countryCodeRaw: string,
    nameRaw: string,
    nameTrRaw: string | null
  ): Promise<string | null> {
    const countryCode = countryCodeRaw.trim().toUpperCase();
    const name = nameRaw.trim();
    if (!countryCode || countryCode.length !== 2 || !name) {
      return "Geçersiz TR adı isteği";
    }

    const nameKey = catalogNameKey(name, countryCode);
    const nameTr = nameTrRaw?.trim() ?? "";

    if (!nameTr) {
      await admin
        .from("yp_city_name_tr")
        .delete()
        .eq("country_code", countryCode)
        .eq("name_key", nameKey);
      return null;
    }

    const displayTr = formatCityDisplayName(nameTr);
    const now = new Date().toISOString();
    const { data: existing } = await admin
      .from("yp_city_name_tr")
      .select("id")
      .eq("country_code", countryCode)
      .eq("name_key", nameKey)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await admin
        .from("yp_city_name_tr")
        .update({ name_tr: displayTr, updated_at: now })
        .eq("id", existing.id);
      return error?.message ?? null;
    }

    const { error } = await admin.from("yp_city_name_tr").insert({
      country_code: countryCode,
      name_key: nameKey,
      name_tr: displayTr,
      updated_at: now,
    });
    if (error && isMissingRelationError(error.message)) {
      return "yp_city_name_tr tablosu yok — migration 035 uygulanmalı";
    }
    return error?.message ?? null;
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
