import { NextResponse } from "next/server";
import {
  canonicalCatalogParkName,
  parkHeroLookupKey,
  parkHeroR2ObjectKey,
  parkHeroR2ObjectKeys,
  revalidateAllParkHeroCaches,
  revalidateParkHeroCaches,
  type ParkHeroImageRow,
} from "@/lib/park/park-hero-images";
import { requireAdminClient, requireKamikazeMasterApi } from "@/lib/kamikaze/auth";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import {
  deleteR2Objects,
  isR2Configured,
  parseR2ObjectKey,
  uploadPhotoToR2,
} from "@/lib/storage/r2";
import { formatPhotoUploadError } from "@/lib/utils/photo-upload-error";
import { heroStorageExtension, optimizeImage } from "@/lib/utils/image";
import {
  HeroImageInputError,
  readKamikazeHeroImageInput,
} from "@/lib/kamikaze/hero-image-input";
import { PARK_TYPES, type ParkType } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 300;

const BULK_HERO_DELETE_LIMIT = 200;
const R2_DELETE_CHUNK = 40;

function isMissingRelationError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("schema cache") ||
    lower.includes("could not find the table")
  );
}

function parseParkType(value: string): ParkType | null {
  const normalized = value.trim() as ParkType;
  return PARK_TYPES.includes(normalized) ? normalized : null;
}

type StoredParkHeroRow = {
  id: string;
  countryCode: string;
  parkType: ParkType;
  nameKey: string;
  parkName: string;
  imageUrl: string;
};

function r2KeysForStoredHero(row: StoredParkHeroRow): string[] {
  const keys = parkHeroR2ObjectKeys(row.countryCode, row.parkType, row.nameKey);
  const fromUrl = parseR2ObjectKey(row.imageUrl);
  if (fromUrl) keys.push(fromUrl);
  return [...new Set(keys)];
}

async function deleteR2KeysInChunks(keys: string[]): Promise<void> {
  if (!isR2Configured() || keys.length === 0) return;
  for (let i = 0; i < keys.length; i += R2_DELETE_CHUNK) {
    await deleteR2Objects(keys.slice(i, i + R2_DELETE_CHUNK));
  }
}

function mapStoredHeroRow(row: {
  id?: unknown;
  country_code?: unknown;
  park_type?: unknown;
  name_key?: unknown;
  park_name?: unknown;
  image_url?: unknown;
}): StoredParkHeroRow | null {
  const id = String(row.id ?? "").trim();
  const countryCode = String(row.country_code ?? "").toUpperCase();
  const parkType = parseParkType(String(row.park_type ?? ""));
  const nameKey = String(row.name_key ?? "").trim();
  const parkName = String(row.park_name ?? "").trim();
  const imageUrl = String(row.image_url ?? "").trim();
  if (!id || !countryCode || !parkType || !nameKey) return null;
  return { id, countryCode, parkType, nameKey, parkName, imageUrl };
}

async function deleteStoredParkHeroes(
  admin: SupabaseClient,
  rows: StoredParkHeroRow[],
  revalidateEachPath: boolean
): Promise<{ deleted: number }> {
  if (rows.length === 0) return { deleted: 0 };

  await deleteR2KeysInChunks(rows.flatMap(r2KeysForStoredHero));

  for (let i = 0; i < rows.length; i += R2_DELETE_CHUNK) {
    const chunk = rows.slice(i, i + R2_DELETE_CHUNK);
    const { error: deleteError } = await admin
      .from("yp_park_hero_image")
      .delete()
      .in(
        "id",
        chunk.map((row) => row.id)
      );
    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  if (revalidateEachPath) {
    for (const row of rows) {
      await revalidateParkHeroCaches(row.countryCode, row.parkName || row.nameKey, row.parkType);
    }
  } else {
    await revalidateAllParkHeroCaches();
  }

  return { deleted: rows.length };
}

async function listHeroRows(): Promise<ParkHeroImageRow[]> {
  const adminGate = requireAdminClient();
  const client = "admin" in adminGate ? adminGate.admin : createPublicSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("yp_park_hero_image")
    .select("country_code, park_type, name_key, park_name, image_url")
    .order("country_code", { ascending: true })
    .order("park_name", { ascending: true });

  if (error) {
    if (isMissingRelationError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    countryCode: String(row.country_code ?? "").toUpperCase(),
    parkType: String(row.park_type ?? "") as ParkType,
    nameKey: String(row.name_key ?? ""),
    parkName: String(row.park_name ?? ""),
    imageUrl: String(row.image_url ?? ""),
  }));
}

export async function GET() {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  try {
    const images = await listHeroRows();
    return NextResponse.json(
      { images },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Görseller yüklenemedi" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const adminGate = requireAdminClient();
  if ("response" in adminGate) return adminGate.response;
  const admin = adminGate.admin;

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: formatPhotoUploadError("R2 not configured") },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const countryCode = String(formData.get("countryCode") ?? "")
    .trim()
    .toUpperCase();
  const parkNameRaw = String(formData.get("parkName") ?? "").trim();
  const parkType = parseParkType(String(formData.get("parkType") ?? ""));

  if (!countryCode || countryCode.length !== 2 || !parkNameRaw || !parkType) {
    return NextResponse.json({ error: "Ülke, park adı ve tür gerekli" }, { status: 400 });
  }

  let imageInput: { buffer: Buffer; contentType: string };
  try {
    imageInput = await readKamikazeHeroImageInput(formData);
  } catch (error) {
    const message =
      error instanceof HeroImageInputError ? error.message : "Görsel okunamadı";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const canonical = canonicalCatalogParkName(parkNameRaw);
    const nameKey = catalogNameKey(canonical, countryCode);
    const optimized = await optimizeImage(imageInput.buffer, imageInput.contentType);
    const storageExt = heroStorageExtension(optimized.extension);

    await deleteR2Objects(parkHeroR2ObjectKeys(countryCode, parkType, nameKey));

    const r2Key = parkHeroR2ObjectKey(countryCode, parkType, nameKey, storageExt);
    const publicUrl = await uploadPhotoToR2(r2Key, optimized.buffer, optimized.contentType);
    const imageUrl = `${publicUrl}?v=${Date.now()}`;

    const { data: existing, error: existingError } = await admin
      .from("yp_park_hero_image")
      .select("id")
      .eq("country_code", countryCode)
      .eq("park_type", parkType)
      .eq("name_key", nameKey)
      .maybeSingle();

    if (existingError) {
      if (isMissingRelationError(existingError.message)) {
        return NextResponse.json(
          { error: "yp_park_hero_image tablosu yok — migration 040 uygulanmalı" },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: existingError.message }, { status: 400 });
    }

    const now = new Date().toISOString();
    const payload = {
      country_code: countryCode,
      park_type: parkType,
      name_key: nameKey,
      park_name: canonical,
      image_url: imageUrl,
      updated_at: now,
    };

    const writeResult = existing?.id
      ? await admin
          .from("yp_park_hero_image")
          .update(payload)
          .eq("id", existing.id)
          .select("country_code, park_type, name_key, park_name, image_url")
          .single()
      : await admin
          .from("yp_park_hero_image")
          .insert(payload)
          .select("country_code, park_type, name_key, park_name, image_url")
          .single();

    const { data, error } = writeResult;

    if (error) {
      if (isMissingRelationError(error.message)) {
        return NextResponse.json(
          { error: "yp_park_hero_image tablosu yok — migration 040 uygulanmalı" },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await revalidateParkHeroCaches(countryCode, canonical, parkType);

    const row: ParkHeroImageRow = {
      countryCode: String(data.country_code).toUpperCase(),
      parkType: String(data.park_type) as ParkType,
      nameKey: String(data.name_key),
      parkName: String(data.park_name),
      imageUrl: String(data.image_url),
    };

    return NextResponse.json({ image: row });
  } catch (err) {
    console.error("POST /api/kamikaze/park-images failed", err);
    return NextResponse.json(
      {
        error: formatPhotoUploadError(
          err instanceof Error ? err.message : "Görsel yüklenemedi"
        ),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const adminGate = requireAdminClient();
  if ("response" in adminGate) return adminGate.response;
  const admin = adminGate.admin;

  let body: {
    all?: boolean;
    countryCode?: string;
    parkName?: string;
    parkType?: string;
    items?: Array<{ countryCode?: string; parkName?: string; parkType?: string }>;
  };
  try {
    body = (await request.json()) as {
      all?: boolean;
      countryCode?: string;
      parkName?: string;
      parkType?: string;
      items?: Array<{ countryCode?: string; parkName?: string; parkType?: string }>;
    };
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  try {
    if (body.all === true) {
      const { data, error: readError } = await admin
        .from("yp_park_hero_image")
        .select("id, country_code, park_type, name_key, park_name, image_url");

      if (readError) {
        if (isMissingRelationError(readError.message)) {
          return NextResponse.json(
            { error: "yp_park_hero_image tablosu yok — migration 040 uygulanmalı" },
            { status: 503 }
          );
        }
        return NextResponse.json({ error: readError.message }, { status: 400 });
      }

      const rows = (data ?? [])
        .map(mapStoredHeroRow)
        .filter((row): row is StoredParkHeroRow => row != null);
      const result = await deleteStoredParkHeroes(admin, rows, false);
      return NextResponse.json({ ok: true, deleted: result.deleted });
    }

    const itemInputs = Array.isArray(body.items) ? body.items : null;
    if (itemInputs) {
      if (itemInputs.length === 0) {
        return NextResponse.json({ error: "Silinecek kapak seçilmedi" }, { status: 400 });
      }
      if (itemInputs.length > BULK_HERO_DELETE_LIMIT) {
        return NextResponse.json(
          { error: `En fazla ${BULK_HERO_DELETE_LIMIT} kapak silinebilir` },
          { status: 400 }
        );
      }

      const { data, error: readError } = await admin
        .from("yp_park_hero_image")
        .select("id, country_code, park_type, name_key, park_name, image_url");

      if (readError) {
        return NextResponse.json({ error: readError.message }, { status: 400 });
      }

      const byLookup = new Map<string, StoredParkHeroRow>();
      for (const mapped of (data ?? []).map(mapStoredHeroRow)) {
        if (!mapped) continue;
        byLookup.set(
          `${mapped.countryCode}:${mapped.parkType}:${mapped.nameKey}`,
          mapped
        );
      }

      const selected: StoredParkHeroRow[] = [];
      const seen = new Set<string>();
      for (const item of itemInputs) {
        const countryCode = item.countryCode?.trim().toUpperCase() ?? "";
        const parkNameRaw = item.parkName?.trim() ?? "";
        const parkType = parseParkType(String(item.parkType ?? ""));
        if (!countryCode || countryCode.length !== 2 || !parkNameRaw || !parkType) {
          continue;
        }
        const canonical = canonicalCatalogParkName(parkNameRaw);
        const nameKey = catalogNameKey(canonical, countryCode);
        const lookup = `${countryCode}:${parkType}:${nameKey}`;
        const row = byLookup.get(lookup);
        if (!row || seen.has(row.id)) continue;
        seen.add(row.id);
        selected.push(row);
      }

      const result = await deleteStoredParkHeroes(admin, selected, selected.length <= 20);
      return NextResponse.json({ ok: true, deleted: result.deleted });
    }

    const countryCode = body.countryCode?.trim().toUpperCase() ?? "";
    const parkNameRaw = body.parkName?.trim() ?? "";
    const parkType = parseParkType(String(body.parkType ?? ""));

    if (!countryCode || countryCode.length !== 2 || !parkNameRaw || !parkType) {
      return NextResponse.json({ error: "Ülke, park adı ve tür gerekli" }, { status: 400 });
    }

    const canonical = canonicalCatalogParkName(parkNameRaw);
    const nameKey = catalogNameKey(canonical, countryCode);
    const lookupKey = parkHeroLookupKey(countryCode, canonical, parkType);

    const { data: existing, error: readError } = await admin
      .from("yp_park_hero_image")
      .select("id, country_code, park_type, name_key, park_name, image_url")
      .eq("country_code", countryCode)
      .eq("park_type", parkType)
      .eq("name_key", nameKey)
      .maybeSingle();

    if (readError) {
      if (isMissingRelationError(readError.message)) {
        return NextResponse.json(
          { error: "yp_park_hero_image tablosu yok — migration 040 uygulanmalı" },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: readError.message }, { status: 400 });
    }

    const row = existing ? mapStoredHeroRow(existing) : null;
    if (!row) {
      return NextResponse.json({ error: "Özel görsel bulunamadı" }, { status: 404 });
    }

    await deleteStoredParkHeroes(admin, [row], true);
    return NextResponse.json({ ok: true, lookupKey });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kapaklar silinemedi" },
      { status: 400 }
    );
  }
}
