import { NextResponse } from "next/server";
import {
  canonicalCatalogCityName,
  cityHeroLookupKey,
  cityHeroR2ObjectKey,
  cityHeroR2ObjectKeys,
  revalidateCityHeroCaches,
  type CityHeroImageRow,
} from "@/lib/city/city-hero-images";
import { requireAdminClient, requireKamikazeMasterApi } from "@/lib/kamikaze/auth";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import { LIMITS } from "@/lib/constants";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import {
  deleteR2Objects,
  isR2Configured,
  uploadPhotoToR2,
} from "@/lib/storage/r2";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { formatPhotoUploadError } from "@/lib/utils/photo-upload-error";
import { optimizeImageToWebp } from "@/lib/utils/image";

function isMissingRelationError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("schema cache") ||
    lower.includes("could not find the table")
  );
}

async function listHeroRows(): Promise<CityHeroImageRow[]> {
  const client = createPublicSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from("yp_city_hero_image")
    .select("country_code, name_key, city_name, image_url")
    .order("country_code", { ascending: true })
    .order("city_name", { ascending: true });

  if (error) {
    if (isMissingRelationError(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    countryCode: String(row.country_code ?? "").toUpperCase(),
    nameKey: String(row.name_key ?? ""),
    cityName: String(row.city_name ?? ""),
    imageUrl: String(row.image_url ?? ""),
  }));
}

async function revalidateCityHeroImages(
  countryCode: string,
  cityName: string
): Promise<void> {
  await revalidateCityHeroCaches(countryCode, cityName);
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
  const cityNameRaw = String(formData.get("cityName") ?? "").trim();
  const file = formData.get("file");

  if (!countryCode || countryCode.length !== 2 || !cityNameRaw) {
    return NextResponse.json({ error: "Ülke ve şehir adı gerekli" }, { status: 400 });
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
    const canonical = canonicalCatalogCityName(countryCode, formatCityDisplayName(cityNameRaw));
    const nameKey = catalogNameKey(canonical, countryCode);
    const buffer = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeImageToWebp(buffer, file.type);

    await deleteR2Objects(cityHeroR2ObjectKeys(countryCode, nameKey));

    const r2Key = cityHeroR2ObjectKey(countryCode, nameKey, "webp");
    const publicUrl = await uploadPhotoToR2(r2Key, optimized.buffer, optimized.contentType);
    const imageUrl = `${publicUrl}?v=${Date.now()}`;

    const { data: existing, error: existingError } = await admin
      .from("yp_city_hero_image")
      .select("id")
      .eq("country_code", countryCode)
      .eq("name_key", nameKey)
      .maybeSingle();

    if (existingError) {
      if (isMissingRelationError(existingError.message)) {
        return NextResponse.json(
          { error: "yp_city_hero_image tablosu yok — migration 038 uygulanmalı" },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: existingError.message }, { status: 400 });
    }

    const now = new Date().toISOString();
    const payload = {
      country_code: countryCode,
      name_key: nameKey,
      city_name: canonical,
      image_url: imageUrl,
      updated_at: now,
    };

    const writeResult = existing?.id
      ? await admin.from("yp_city_hero_image").update(payload).eq("id", existing.id).select("country_code, name_key, city_name, image_url").single()
      : await admin.from("yp_city_hero_image").insert(payload).select("country_code, name_key, city_name, image_url").single();

    const { data, error } = writeResult;

    if (error) {
      if (isMissingRelationError(error.message)) {
        return NextResponse.json(
          { error: "yp_city_hero_image tablosu yok — migration 038 uygulanmalı" },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await revalidateCityHeroImages(countryCode, canonical);

    const row: CityHeroImageRow = {
      countryCode: String(data.country_code).toUpperCase(),
      nameKey: String(data.name_key),
      cityName: String(data.city_name),
      imageUrl: String(data.image_url),
    };

    return NextResponse.json({ image: row });
  } catch (err) {
    console.error("POST /api/kamikaze/city-images failed", err);
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

  let body: { countryCode?: string; cityName?: string };
  try {
    body = (await request.json()) as { countryCode?: string; cityName?: string };
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const countryCode = body.countryCode?.trim().toUpperCase() ?? "";
  const cityNameRaw = body.cityName?.trim() ?? "";

  if (!countryCode || countryCode.length !== 2 || !cityNameRaw) {
    return NextResponse.json({ error: "Ülke ve şehir adı gerekli" }, { status: 400 });
  }

  const canonical = canonicalCatalogCityName(countryCode, formatCityDisplayName(cityNameRaw));
  const nameKey = catalogNameKey(canonical, countryCode);
  const lookupKey = cityHeroLookupKey(countryCode, canonical);

  const { data: existing, error: readError } = await admin
    .from("yp_city_hero_image")
    .select("image_url")
    .eq("country_code", countryCode)
    .eq("name_key", nameKey)
    .maybeSingle();

  if (readError) {
    if (isMissingRelationError(readError.message)) {
      return NextResponse.json(
        { error: "yp_city_hero_image tablosu yok — migration 038 uygulanmalı" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: readError.message }, { status: 400 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Özel görsel bulunamadı" }, { status: 404 });
  }

  if (isR2Configured()) {
    await deleteR2Objects(cityHeroR2ObjectKeys(countryCode, nameKey));
  }

  const { error: deleteError } = await admin
    .from("yp_city_hero_image")
    .delete()
    .eq("country_code", countryCode)
    .eq("name_key", nameKey);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  await revalidateCityHeroImages(countryCode, canonical);

  return NextResponse.json({ ok: true, lookupKey });
}
