/**
 * Pilot: seed custom city hero images for all CZ catalog cities (5).
 * Sources: scripts/cz-city-hero-sources.json (Wikimedia Commons).
 *
 * Usage:
 *   node scripts/seed-cz-city-heroes.mjs           # dry run
 *   node scripts/seed-cz-city-heroes.mjs --confirm # upload to R2 + Supabase
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(path.join(root, "package.json"));

const IMAGE_MAX_WIDTH = 1080;
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const WIKIMEDIA_USER_AGENT = "TravelerPinBot/1.0 (https://travelerpin.com; cz-hero-seed)";

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local not found");
  }
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function normalizeCityKey(value) {
  return value
    .trim()
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("İ", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
}

function formatCityDisplayName(name) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  return trimmed
    .split(" ")
    .map((word) => {
      if (!word) return word;
      const lower = word.toLocaleLowerCase("tr");
      const first = lower.charAt(0);
      if (!first) return word;
      return first.toLocaleUpperCase("tr") + lower.slice(1);
    })
    .join(" ");
}

function catalogNameKey(name, countryCode) {
  return normalizeCityKey(formatCityDisplayName(name));
}

function cityHeroR2ObjectKey(countryCode, nameKey, extension = "webp") {
  return `city-heroes/${countryCode.toLowerCase()}/${nameKey}.${extension}`;
}

function cityHeroR2ObjectKeys(countryCode, nameKey) {
  return ["webp", "jpg", "jpeg", "png"].map((extension) =>
    cityHeroR2ObjectKey(countryCode, nameKey, extension)
  );
}

function getR2Config(env) {
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = env.R2_BUCKET_NAME?.trim();
  const publicBase =
    env.R2_PUBLIC_BASE_URL?.trim() || env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim();
  const endpoint =
    env.R2_ENDPOINT?.trim()?.replace(/\/$/, "") ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase || !endpoint) {
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase, endpoint };
}

function createR2Client(config) {
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

async function deleteR2Objects(client, bucket, keys) {
  for (const key of keys) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      // ignore missing
    }
  }
}

async function uploadPhotoToR2(client, config, key, buffer, contentType) {
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  const base = config.publicBase.replace(/\/$/, "");
  return `${base}/${key}`;
}

async function fetchImage(url) {
  const response = await fetch(url, {
    headers: { Accept: "image/*", "User-Agent": WIKIMEDIA_USER_AGENT },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} for ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > AVATAR_MAX_BYTES) {
    throw new Error(`Image too large (${buffer.byteLength} bytes)`);
  }
  const contentType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  return { buffer, contentType };
}

async function optimizeToWebp(buffer) {
  const sharp = require("sharp");
  const out = await sharp(buffer)
    .rotate()
    .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  return { buffer: out, contentType: "image/webp", extension: "webp" };
}

async function upsertHeroRow(supabase, row) {
  const { countryCode, nameKey, cityName, imageUrl } = row;
  const { data: existing, error: readError } = await supabase
    .from("yp_city_hero_image")
    .select("id")
    .eq("country_code", countryCode)
    .eq("name_key", nameKey)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  const payload = {
    country_code: countryCode,
    name_key: nameKey,
    city_name: cityName,
    image_url: imageUrl,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase.from("yp_city_hero_image").update(payload).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return "updated";
  }

  const { error } = await supabase.from("yp_city_hero_image").insert(payload);
  if (error) throw new Error(error.message);
  return "inserted";
}

const confirmed = process.argv.includes("--confirm");
const env = loadEnv();
const sources = JSON.parse(
  fs.readFileSync(path.join(__dirname, "cz-city-hero-sources.json"), "utf8")
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
}

const r2Config = getR2Config(env);
if (!r2Config) {
  throw new Error("R2 env vars missing (account, keys, bucket, public base URL)");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`CZ city hero seed — ${sources.length} cities (${confirmed ? "LIVE" : "dry run"})`);

for (const entry of sources) {
  const countryCode = String(entry.countryCode).trim().toUpperCase();
  const cityName = formatCityDisplayName(String(entry.cityName));
  const nameKey = catalogNameKey(cityName, countryCode);
  const label = `${countryCode} · ${cityName}`;

  try {
    const { buffer, contentType } = await fetchImage(entry.imageUrl);
    const optimized = await optimizeToWebp(buffer);
    const r2Key = cityHeroR2ObjectKey(countryCode, nameKey, optimized.extension);
    const publicUrl = `${r2Config.publicBase.replace(/\/$/, "")}/${r2Key}?v=${Date.now()}`;

    console.log(`  ${label}: fetched ${buffer.byteLength}b → webp ${optimized.buffer.byteLength}b`);

    if (!confirmed) continue;

    await new Promise((resolve) => setTimeout(resolve, 800));

    const r2 = createR2Client(r2Config);
    await deleteR2Objects(r2, r2Config.bucket, cityHeroR2ObjectKeys(countryCode, nameKey));
    const storedUrl = await uploadPhotoToR2(
      r2,
      r2Config,
      r2Key,
      optimized.buffer,
      optimized.contentType
    );
    const imageUrl = `${storedUrl}?v=${Date.now()}`;
    const action = await upsertHeroRow(supabase, {
      countryCode,
      nameKey,
      cityName,
      imageUrl,
    });
    console.log(`    ✓ ${action} → ${imageUrl}`);
  } catch (err) {
    console.error(`    ✗ ${label}:`, err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }

  await new Promise((resolve) => setTimeout(resolve, 600));
}

if (!confirmed) {
  console.log("\nDry run OK. Re-run with --confirm to write R2 + Supabase.");
}
