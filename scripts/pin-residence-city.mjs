/**
 * One-shot: pin a user's residence city if missing.
 * Usage: node scripts/pin-residence-city.mjs fitalya
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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
    .replaceAll("İ", "i");
}

const username = (process.argv[2] ?? "").trim().toLowerCase();
if (!username) {
  console.error("Usage: node scripts/pin-residence-city.mjs <username>");
  process.exit(1);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

console.log("url", url);
console.log("serviceKey length", serviceKey.length);

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Probe auth admin to validate service role key.
const probe = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
if (probe.error) {
  console.error("Service role probe failed:", probe.error.message);
  if (anonKey) {
    console.error("Falling back to anon key for read-only check...");
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon
      .from("profiles")
      .select("id, username, residence")
      .eq("username", username)
      .maybeSingle();
    console.log("anon profile", data, error?.message);
  }
  process.exit(1);
}

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, username, residence")
  .eq("username", username)
  .maybeSingle();

if (profileError || !profile) {
  console.error("Profile not found", profileError?.message);
  process.exit(1);
}

console.log("profile", {
  id: profile.id,
  username: profile.username,
  residence: profile.residence,
});

if (!profile.residence?.trim()) {
  console.error("No residence set on profile");
  process.exit(1);
}

const residence = profile.residence.trim();
const cityName = residence.split(",")[0].trim();
const isIstanbul = normalizeCityKey(cityName) === "istanbul";

const pin = isIstanbul
  ? {
      city_name: "Istanbul",
      country_code: "TR",
      country_name: "Türkiye",
      latitude: 41.0176,
      longitude: 28.9711,
    }
  : null;

if (!pin) {
  console.error("This script only auto-resolves Istanbul. Residence was:", profile.residence);
  process.exit(1);
}

const { data: existingCities } = await supabase
  .from("visited_cities")
  .select("id, city_name, country_code")
  .eq("user_id", profile.id)
  .eq("country_code", pin.country_code);

const already = (existingCities ?? []).find(
  (c) => normalizeCityKey(c.city_name) === normalizeCityKey(pin.city_name)
);

if (already) {
  console.log("Already pinned", already);
  process.exit(0);
}

const { data: country } = await supabase
  .from("visited_countries")
  .select("id")
  .eq("user_id", profile.id)
  .eq("country_code", pin.country_code)
  .maybeSingle();

if (!country) {
  const { error: countryError } = await supabase.from("visited_countries").insert({
    user_id: profile.id,
    country_code: pin.country_code,
    country_name: pin.country_name,
  });
  if (countryError && countryError.code !== "23505") {
    console.error("Country insert failed", countryError.message);
    process.exit(1);
  }
  console.log("Pinned country", pin.country_code);
}

const { data: city, error: cityError } = await supabase
  .from("visited_cities")
  .insert({
    user_id: profile.id,
    city_name: pin.city_name,
    country_code: pin.country_code,
    country_name: pin.country_name,
    latitude: pin.latitude,
    longitude: pin.longitude,
    note: null,
    visit_dates: [],
  })
  .select()
  .single();

if (cityError) {
  console.error("City insert failed", cityError.message);
  process.exit(1);
}

console.log("Pinned city", city.city_name, city.id);
