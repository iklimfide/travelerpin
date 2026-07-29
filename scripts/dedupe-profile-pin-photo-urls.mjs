/**
 * Remove duplicate pin photos (same image bytes, different R2 URLs) for a profile.
 *
 * Usage:
 *   node scripts/dedupe-profile-pin-photo-urls.mjs guvencgiller
 *   node scripts/dedupe-profile-pin-photo-urls.mjs guvencgiller --confirm
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) throw new Error(".env.local not found");
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

async function sha256ForUrl(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Fetch ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function dedupeUrlsByHash(urls, urlToHash) {
  const seen = new Set();
  const kept = [];
  const removed = [];
  for (const url of urls) {
    const hash = urlToHash.get(url);
    if (!hash) {
      kept.push(url);
      continue;
    }
    if (seen.has(hash)) {
      removed.push(url);
      continue;
    }
    seen.add(hash);
    kept.push(url);
  }
  return { kept, removed };
}

const username = (process.argv[2] ?? "").trim().toLowerCase();
const confirm = process.argv.includes("--confirm");

if (!username) {
  console.error("Usage: node scripts/dedupe-profile-pin-photo-urls.mjs <username> [--confirm]");
  process.exit(1);
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, username")
  .eq("username", username)
  .maybeSingle();

if (profileError) throw new Error(profileError.message);
if (!profile?.id) throw new Error(`Profile @${username} not found`);

const [{ data: cities }, { data: parks }] = await Promise.all([
  supabase.from("visited_cities").select("id, city_name, photo_url, photo_urls").eq("user_id", profile.id),
  supabase.from("visited_parks").select("id, park_name, photo_url, photo_urls").eq("user_id", profile.id),
]);

const hashCache = new Map();

async function hashWithCache(url) {
  if (hashCache.has(url)) return hashCache.get(url);
  try {
    const hash = await sha256ForUrl(url);
    hashCache.set(url, hash);
    return hash;
  } catch (err) {
    console.warn("Skip hash:", url, err instanceof Error ? err.message : err);
    hashCache.set(url, null);
    return null;
  }
}

let totalRemoved = 0;

async function processRow(table, row, label) {
  const urls = Array.isArray(row.photo_urls)
    ? row.photo_urls.filter(Boolean)
    : row.photo_url
      ? [row.photo_url]
      : [];
  if (urls.length < 2) return;

  const urlToHash = new Map();
  for (const url of urls) {
    urlToHash.set(url, await hashWithCache(url));
  }

  const { kept, removed } = dedupeUrlsByHash(urls, urlToHash);
  if (removed.length === 0) return;

  console.log(`${label}: ${urls.length} → ${kept.length} (−${removed.length} duplicate bytes)`);
  totalRemoved += removed.length;

  if (!confirm) return;

  const photo_url = kept[0] ?? null;
  const { error } = await supabase
    .from(table)
    .update({
      photo_url,
      photo_urls: kept,
      media_url: photo_url,
      media_preview_url: photo_url,
      media_type: photo_url ? "photo" : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("user_id", profile.id);

  if (error) throw new Error(`${table} update: ${error.message}`);
}

for (const city of cities ?? []) {
  await processRow("visited_cities", city, city.city_name);
}
for (const park of parks ?? []) {
  await processRow("visited_parks", park, park.park_name);
}

console.log(
  confirm
    ? `Done. Removed ${totalRemoved} duplicate photo URL(s) for @${username}.`
    : `Dry run. Would remove ${totalRemoved} duplicate URL(s). Re-run with --confirm.`
);
