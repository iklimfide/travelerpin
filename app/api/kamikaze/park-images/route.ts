import { NextResponse } from "next/server";
import {
  canonicalCatalogParkName,
  parkHeroLookupKey,
  parkHeroR2ObjectKey,
  parkHeroR2ObjectKeys,
  revalidateParkHeroCaches,
  type ParkHeroImageRow,
} from "@/lib/park/park-hero-images";
import { requireAdminClient, requireKamikazeMasterApi } from "@/lib/kamikaze/auth";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import { LIMITS } from "@/lib/constants";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import {
  deleteR2Objects,
  isR2Configured,
  uploadPhotoToR2,
} from "@/lib/storage/r2";
import { formatPhotoUploadError } from "@/lib/utils/photo-upload-error";
import { optimizeImageToWebp } from "@/lib/utils/image";
import { PARK_TYPES, type ParkType } from "@/types/database";

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

async function listHeroRows(): Promise<ParkHeroImageRow[]> {
  const client = createPublicSupabaseClient();
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
    return NextResponse.json({ images });
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
  const file = formData.get("file");

  if (!countryCode || countryCode.length !== 2 || !parkNameRaw || !parkType) {
    return NextResponse.json({ error: "Ülke, park adı ve tür gerekli" }, { status: 400 });
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Görsel dosyası gerekli" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Dosya bir görsel olmalı" }, { status: 400 });
  }

  if (file.size > LIMITS.avatarMaxBytes) {
    return NextResponse.json({ error: "Görsel en fazla 5 MB olabilir" }, { status: 400 });
  }

  try {
    const canonical = canonicalCatalogParkName(parkNameRaw);
    const nameKey = catalogNameKey(canonical, countryCode);
    const buffer = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeImageToWebp(buffer, file.type);

    await deleteR2Objects(parkHeroR2ObjectKeys(countryCode, parkType, nameKey));

    const r2Key = parkHeroR2ObjectKey(countryCode, parkType, nameKey, "webp");
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

  let body: { countryCode?: string; parkName?: string; parkType?: string };
  try {
    body = (await request.json()) as {
      countryCode?: string;
      parkName?: string;
      parkType?: string;
    };
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
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
    .select("image_url")
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

  if (!existing) {
    return NextResponse.json({ error: "Özel görsel bulunamadı" }, { status: 404 });
  }

  if (isR2Configured()) {
    await deleteR2Objects(parkHeroR2ObjectKeys(countryCode, parkType, nameKey));
  }

  const { error: deleteError } = await admin
    .from("yp_park_hero_image")
    .delete()
    .eq("country_code", countryCode)
    .eq("park_type", parkType)
    .eq("name_key", nameKey);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  await revalidateParkHeroCaches(countryCode, canonical, parkType);

  return NextResponse.json({ ok: true, lookupKey });
}
