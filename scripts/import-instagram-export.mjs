/**
 * Parse Instagram JSON export (+ bundled photos) and attach media to a profile's city pins.
 * Default target: @guvencgiller (Jennifer showcase source — not @arif / kamikaze master).
 *
 * Export stays on your machine. Only optimized photos + pin fields go to Supabase/R2.
 *
 * Usage:
 *   node scripts/import-instagram-export.mjs --export-dir "D:\Downloads\instagram-…"
 *   node scripts/import-instagram-export.mjs --export-dir "…" --confirm
 *   node scripts/import-instagram-export.mjs --export-dir "…" --confirm --limit 5
 *
 * Options:
 *   --export-dir   Unzipped Instagram export folder (required)
 *   --username     Profile username (default: guvencgiller)
 *   --confirm      Upload to R2 + merge into visited_cities
 *   --limit N      Process at most N post groups (testing)
 *   --map FILE     JSON file: { "Location label": { city_name, country_code, country_name } }
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const require = createRequire(path.join(root, "package.json"));

const DEFAULT_USERNAME = "guvencgiller";
const IMAGE_MAX_WIDTH = 1080;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const NOMINATIM_DELAY_MS = 1100;
const USER_AGENT = "TravelerPin/1.0 (https://travelerpin.com; instagram-import-script)";

const PHOTO_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);

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

function parseArgs(argv) {
  const out = {
    exportDir: "",
    username: DEFAULT_USERNAME,
    confirm: false,
    limit: Infinity,
    mapFile: "",
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--confirm") out.confirm = true;
    else if (arg === "--export-dir") out.exportDir = argv[++i] ?? "";
    else if (arg === "--username") out.username = (argv[++i] ?? DEFAULT_USERNAME).trim().toLowerCase();
    else if (arg === "--limit") out.limit = Number(argv[++i]) || Infinity;
    else if (arg === "--map") out.mapFile = argv[++i] ?? "";
    else if (!arg.startsWith("--") && !out.exportDir) out.exportDir = arg;
  }
  return out;
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPhotoUri(uri) {
  const ext = path.extname(uri.split("?")[0]).toLowerCase();
  return PHOTO_EXT.has(ext);
}

function findInstagramPermalink(value, depth = 0) {
  if (depth > 8 || value == null) return null;
  if (typeof value === "string") {
    const match = value.match(
      /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[A-Za-z0-9_-]+\/?/
    );
    return match ? match[0].replace(/\/?$/, "/") : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findInstagramPermalink(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const key of Object.keys(value)) {
      const found = findInstagramPermalink(value[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function extractExifLatLon(mediaObj) {
  const exif =
    mediaObj?.media_metadata?.photo_metadata?.exif_data ??
    mediaObj?.media_metadata?.video_metadata?.exif_data;
  if (!Array.isArray(exif) || exif.length === 0) return null;
  for (const row of exif) {
    const lat = Number(row?.latitude);
    const lon = Number(row?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
      return { latitude: lat, longitude: lon };
    }
  }
  return null;
}

function extractLocationLabel(post) {
  const candidates = [
    post?.location,
    post?.location_name,
    post?.title,
    post?.caption,
  ];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > 120) continue;
    if (/^https?:\/\//i.test(trimmed)) continue;
    if (trimmed.includes("#") && trimmed.length > 80) continue;
    if (/,\s*[A-Za-z]{2,}/.test(trimmed) || /,\s/.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

function resolveMediaAbsolutePath(exportRoot, uri) {
  if (!uri || typeof uri !== "string") return null;
  const cleaned = uri.replace(/^\.\//, "").replace(/\\/g, "/");
  const candidates = [
    path.join(exportRoot, cleaned),
    path.join(exportRoot, cleaned.replace(/^media\//, "public-media/")),
    path.join(exportRoot, "your_instagram_activity", cleaned),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function collectPostJsonFiles(exportRoot) {
  const results = [];
  const prefer = [
    path.join(exportRoot, "your_instagram_activity", "media"),
    path.join(exportRoot, "content"),
    exportRoot,
  ];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".json")) continue;
      if (entry.name.endsWith(".json.xz")) continue;
      const lower = entry.name.toLowerCase();
      if (
        lower.includes("posts") ||
        lower.includes("reels") ||
        lower.includes("archived") ||
        lower.includes("igtv")
      ) {
        results.push(full);
      }
    }
  }

  for (const base of prefer) walk(base);
  return [...new Set(results)];
}

function parsePostsFromJsonFile(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return [];
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }

  const list = Array.isArray(data) ? data : data?.posts ?? data?.ig_posts ?? data?.media ?? null;
  if (!Array.isArray(list)) return [];

  const posts = [];
  for (const post of list) {
    const mediaList = post?.media;
    if (!Array.isArray(mediaList) || mediaList.length === 0) continue;

    const frames = [];
    for (const media of mediaList) {
      const uri = media?.uri;
      if (typeof uri !== "string" || !isPhotoUri(uri)) continue;
      frames.push({
        uri,
        exif: extractExifLatLon(media),
        timestamp: media?.creation_timestamp ?? post?.creation_timestamp ?? null,
      });
    }
    if (frames.length === 0) continue;

    posts.push({
      sourceFile: filePath,
      permalink: findInstagramPermalink(post),
      locationLabel: extractLocationLabel(post),
      caption: typeof post?.title === "string" ? post.title : null,
      frames,
      exif: frames.map((f) => f.exif).find(Boolean) ?? null,
    });
  }
  return posts;
}

function loadLocationMap(mapFile) {
  if (!mapFile) return {};
  const abs = path.isAbsolute(mapFile) ? mapFile : path.join(process.cwd(), mapFile);
  if (!fs.existsSync(abs)) {
    throw new Error(`Map file not found: ${abs}`);
  }
  const data = JSON.parse(fs.readFileSync(abs, "utf8"));
  if (!data || typeof data !== "object") return {};
  return data;
}

let lastNominatimAt = 0;

async function nominatimFetch(url) {
  const now = Date.now();
  const wait = Math.max(0, lastNominatimAt + NOMINATIM_DELAY_MS - now);
  if (wait > 0) await sleep(wait);
  lastNominatimAt = Date.now();

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Nominatim ${response.status}: ${url}`);
  }
  return response.json();
}

async function reverseGeocodeCity(lat, lon) {
  const data = await nominatimFetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`
  );
  const address = data?.address ?? {};
  const cityName =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county ??
    data?.name;
  const countryCode = address.country_code?.toUpperCase();
  if (!cityName || !countryCode) return null;
  return {
    city_name: formatCityDisplayName(String(cityName)),
    country_code: countryCode,
    country_name: address.country ?? countryCode,
    latitude: lat,
    longitude: lon,
  };
}

async function forwardGeocodeLocationLabel(label) {
  const data = await nominatimFetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(label)}&limit=1&addressdetails=1`
  );
  const hit = data?.[0];
  if (!hit) return null;
  const address = hit.address ?? {};
  const cityName =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    hit.name;
  const countryCode = address.country_code?.toUpperCase();
  if (!cityName || !countryCode) return null;
  return {
    city_name: formatCityDisplayName(String(cityName)),
    country_code: countryCode,
    country_name: address.country ?? countryCode,
    latitude: Number(hit.lat),
    longitude: Number(hit.lon),
  };
}

async function resolveCityForPost(post, locationMap) {
  if (post.locationLabel && locationMap[post.locationLabel]) {
    return { ...locationMap[post.locationLabel], bucket: post.locationLabel };
  }

  if (post.locationLabel) {
    const fromLabel = await forwardGeocodeLocationLabel(post.locationLabel);
    if (fromLabel) {
      return { ...fromLabel, bucket: `${fromLabel.country_code}|${normalizeCityKey(fromLabel.city_name)}` };
    }
  }

  if (post.exif) {
    const fromGps = await reverseGeocodeCity(post.exif.latitude, post.exif.longitude);
    if (fromGps) {
      return {
        ...fromGps,
        bucket: `${fromGps.country_code}|${normalizeCityKey(fromGps.city_name)}`,
      };
    }
  }

  return {
    city_name: null,
    country_code: null,
    country_name: null,
    latitude: null,
    longitude: null,
    bucket: "__unassigned__",
  };
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

async function optimizePhotoBuffer(inputBuffer) {
  const sharp = require("sharp");
  const out = await sharp(inputBuffer)
    .rotate()
    .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  if (out.byteLength > MAX_PHOTO_BYTES) {
    throw new Error(`Optimized image still too large (${out.byteLength} bytes)`);
  }
  return { buffer: out, contentType: "image/webp", extension: "webp" };
}

function pinPhotoObjectKey(userId, stem, extension) {
  const safe = stem.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) || "photo";
  return `${userId}/${safe}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
}

async function uploadPinPhoto(r2Client, r2Config, userId, filePath) {
  const inputBuffer = fs.readFileSync(filePath);
  if (inputBuffer.byteLength > MAX_PHOTO_BYTES) {
    throw new Error(`File too large: ${filePath}`);
  }
  const optimized = await optimizePhotoBuffer(inputBuffer);
  const key = pinPhotoObjectKey(userId, path.basename(filePath, path.extname(filePath)), optimized.extension);
  await r2Client.send(
    new PutObjectCommand({
      Bucket: r2Config.bucket,
      Key: key,
      Body: optimized.buffer,
      ContentType: optimized.contentType,
    })
  );
  const base = r2Config.publicBase.replace(/\/$/, "");
  return `${base}/${key}`;
}

function normalizeInstagramUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hostname = "www.instagram.com";
    let pathname = parsed.pathname.replace(/\/+$/, "");
    if (!pathname.endsWith("/")) pathname += "/";
    return `${parsed.protocol}//${parsed.hostname}${pathname}`;
  } catch {
    return url;
  }
}

function mergeUniqueUrls(existing, added) {
  const seen = new Set(existing.map((u) => u.toLowerCase()));
  const out = [...existing];
  for (const raw of added) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function countryDisplayName(code) {
  try {
    const countries = require("i18n-iso-countries");
    countries.registerLocale(require("i18n-iso-countries/langs/en.json"));
    return countries.getName(code, "en") || code;
  } catch {
    return code;
  }
}

async function ensureVisitedCountry(supabase, userId, countryCode, countryName) {
  const code = countryCode.toUpperCase();
  const { data: existing } = await supabase
    .from("visited_countries")
    .select("id")
    .eq("user_id", userId)
    .eq("country_code", code)
    .maybeSingle();

  if (existing?.id) return;

  const { error } = await supabase.from("visited_countries").insert({
    user_id: userId,
    country_code: code,
    country_name: countryName,
  });
  if (error && error.code !== "23505") {
    throw new Error(`visited_countries insert: ${error.message}`);
  }
}

async function findVisitedCity(supabase, userId, countryCode, cityName) {
  const code = countryCode.toUpperCase();
  const key = normalizeCityKey(cityName);
  const { data, error } = await supabase
    .from("visited_cities")
    .select("*")
    .eq("user_id", userId)
    .eq("country_code", code);
  if (error) throw new Error(error.message);

  return (data ?? []).find((row) => normalizeCityKey(row.city_name) === key) ?? null;
}

async function upsertCityPinMedia(options) {
  const {
    supabase,
    userId,
    cityMeta,
    photoUrls,
    instagramUrls,
  } = options;

  await ensureVisitedCountry(
    supabase,
    userId,
    cityMeta.country_code,
    cityMeta.country_name || countryDisplayName(cityMeta.country_code)
  );

  const existing = await findVisitedCity(
    supabase,
    userId,
    cityMeta.country_code,
    cityMeta.city_name
  );

  const mergedPhotos = mergeUniqueUrls(
    Array.isArray(existing?.photo_urls) ? existing.photo_urls : existing?.photo_url ? [existing.photo_url] : [],
    photoUrls
  );
  const mergedIg = mergeUniqueUrls(
    Array.isArray(existing?.instagram_urls) ? existing.instagram_urls : [],
    instagramUrls
  );

  const photo_url = mergedPhotos[0] ?? null;
  const payload = {
    photo_url,
    photo_urls: mergedPhotos,
    instagram_urls: mergedIg,
    media_type: photo_url ? "photo" : mergedIg.length > 0 ? "instagram" : null,
    media_url: photo_url ?? mergedIg[0] ?? null,
    media_preview_url: photo_url,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("visited_cities")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", userId);
    if (error) throw new Error(`visited_cities update: ${error.message}`);
    return { mode: "updated", cityId: existing.id, photoCount: mergedPhotos.length, igCount: mergedIg.length };
  }

  const insertRow = {
    user_id: userId,
    city_name: cityMeta.city_name,
    country_code: cityMeta.country_code.toUpperCase(),
    country_name: cityMeta.country_name || countryDisplayName(cityMeta.country_code),
    latitude: cityMeta.latitude ?? null,
    longitude: cityMeta.longitude ?? null,
    note: null,
    visit_dates: [],
    ...payload,
  };

  const { data, error } = await supabase
    .from("visited_cities")
    .insert(insertRow)
    .select("id")
    .single();
  if (error) throw new Error(`visited_cities insert: ${error.message}`);
  return { mode: "inserted", cityId: data.id, photoCount: mergedPhotos.length, igCount: mergedIg.length };
}

async function main() {
  const args = parseArgs(process.argv);
  const exportDir = path.resolve(args.exportDir || "");
  if (!exportDir || !fs.existsSync(exportDir)) {
    console.error("Provide --export-dir pointing to an unzipped Instagram export.");
    process.exit(1);
  }

  const jsonFiles = collectPostJsonFiles(exportDir);
  if (jsonFiles.length === 0) {
    console.error("No posts/reels JSON found under export. Use JSON format when downloading from Meta.");
    process.exit(1);
  }

  console.log(`Scanning ${jsonFiles.length} JSON file(s) under ${exportDir}`);

  let posts = [];
  for (const file of jsonFiles) {
    posts.push(...parsePostsFromJsonFile(file));
  }

  if (posts.length === 0) {
    console.error("No photo posts parsed. Check that export includes media + posts JSON.");
    process.exit(1);
  }

  posts = posts.slice(0, args.limit);
  const locationMap = loadLocationMap(args.mapFile);

  const groups = new Map();
  for (const post of posts) {
    const city = await resolveCityForPost(post, locationMap);
    const bucket = city.bucket;
    if (!groups.has(bucket)) {
      groups.set(bucket, { city, posts: [], frames: [], permalinks: [] });
    }
    const group = groups.get(bucket);
    group.posts.push(post);
    if (post.permalink) group.permalinks.push(normalizeInstagramUrl(post.permalink));
    for (const frame of post.frames) {
      const abs = resolveMediaAbsolutePath(exportDir, frame.uri);
      if (abs) group.frames.push({ abs, uri: frame.uri, post });
    }
  }

  const summary = [...groups.entries()].map(([bucket, group]) => ({
    bucket,
    city: group.city,
    posts: group.posts.length,
    photosOnDisk: group.frames.length,
    instagramLinks: group.permalinks.length,
  }));

  summary.sort((a, b) => b.photosOnDisk - a.photosOnDisk);
  console.log("\nGrouped preview:");
  for (const row of summary) {
    const label =
      row.bucket === "__unassigned__"
        ? "(unassigned — add --map or location/GPS)"
        : `${row.city.city_name}, ${row.city.country_code}`;
    console.log(`  ${label}: ${row.photosOnDisk} photo(s), ${row.posts} post(s), ${row.instagramLinks} IG link(s)`);
  }

  const previewPath = path.join(root, "scripts", "instagram-import-preview.json");
  fs.writeFileSync(
    previewPath,
    JSON.stringify(
      {
        username: args.username,
        exportDir,
        generatedAt: new Date().toISOString(),
        summary,
      },
      null,
      2
    )
  );
  console.log(`\nWrote ${previewPath}`);

  if (!args.confirm) {
    console.log("\nDry run only. Re-run with --confirm to upload photos + update visited_cities.");
    process.exit(0);
  }

  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local");
  }

  const r2Config = getR2Config(env);
  if (!r2Config) {
    throw new Error("R2 env vars missing — cannot upload pin photos");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", args.username)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile?.id) {
    throw new Error(`Profile not found: @${args.username}`);
  }

  console.log(`\nUploading for @${profile.username} (${profile.id})`);

  const r2Client = createR2Client(r2Config);
  const results = [];

  for (const [bucket, group] of groups) {
    if (bucket === "__unassigned__") {
      console.warn(`Skipping ${group.frames.length} photo(s) in unassigned bucket (use --map).`);
      continue;
    }
    if (!group.city.city_name || !group.city.country_code) continue;

    const uploadedUrls = [];
    for (const frame of group.frames) {
      try {
        const publicUrl = await uploadPinPhoto(r2Client, r2Config, profile.id, frame.abs);
        uploadedUrls.push(publicUrl);
      } catch (err) {
        console.warn(`Upload failed ${frame.uri}:`, err instanceof Error ? err.message : err);
      }
    }

    if (uploadedUrls.length === 0 && group.permalinks.length === 0) continue;

    const uniqueIg = [...new Set(group.permalinks)];
    const saved = await upsertCityPinMedia({
      supabase,
      userId: profile.id,
      cityMeta: group.city,
      photoUrls: uploadedUrls,
      instagramUrls: uniqueIg,
    });

    results.push({
      city: `${group.city.city_name}, ${group.city.country_code}`,
      ...saved,
      uploadedThisRun: uploadedUrls.length,
    });
    console.log(
      `  ${group.city.city_name}, ${group.city.country_code}: +${uploadedUrls.length} photo(s) → ${saved.photoCount} total, ${saved.igCount} IG`
    );
  }

  fs.writeFileSync(
    path.join(root, "scripts", "instagram-import-result.json"),
    JSON.stringify({ username: args.username, results, at: new Date().toISOString() }, null, 2)
  );

  console.log("\nDone. Check @guvencgiller profile + city hubs (gallery uses all photo_urls).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
