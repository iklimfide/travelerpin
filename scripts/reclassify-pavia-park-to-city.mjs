/**
 * Reclassify mistaken park pins named "Pavia" (IT) as cities.
 * Usage: node scripts/reclassify-pavia-park-to-city.mjs [username]
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

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let userId = null;
if (username) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();
  if (error || !profile) {
    console.error("Profile not found", error?.message);
    process.exit(1);
  }
  userId = profile.id;
  console.log("Scope:", profile.username);
}

let parkQuery = supabase
  .from("visited_parks")
  .select("*")
  .eq("country_code", "IT")
  .ilike("park_name", "Pavia");

if (userId) {
  parkQuery = parkQuery.eq("user_id", userId);
}

const { data: parks, error: parksError } = await parkQuery;
if (parksError) {
  console.error("Failed to load parks", parksError.message);
  process.exit(1);
}

if (!parks?.length) {
  console.log("No Pavia park pins to convert.");
  process.exit(0);
}

console.log(`Found ${parks.length} Pavia park pin(s).`);

for (const park of parks) {
  const { data: existingCities, error: citiesError } = await supabase
    .from("visited_cities")
    .select("id, city_name")
    .eq("user_id", park.user_id)
    .eq("country_code", "IT");

  if (citiesError) {
    console.error("Failed to load cities for user", park.user_id, citiesError.message);
    continue;
  }

  const already = (existingCities ?? []).find(
    (city) => normalizeCityKey(city.city_name) === normalizeCityKey("Pavia")
  );

  if (!already) {
    const { data: city, error: insertError } = await supabase
      .from("visited_cities")
      .insert({
        user_id: park.user_id,
        city_name: "Pavia",
        country_code: park.country_code,
        country_name: park.country_name,
        latitude: park.latitude ?? 45.18583,
        longitude: park.longitude ?? 9.16313,
        note: park.note,
        photo_url: park.photo_url,
        instagram_urls: park.instagram_urls ?? [],
        media_type: park.media_type,
        media_url: park.media_url,
        media_preview_url: null,
        visit_dates: park.visit_dates ?? [],
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("City insert failed for park", park.id, insertError.message);
      continue;
    }
    console.log("Created city", city.id, "for user", park.user_id);
  } else {
    console.log("City already exists for user", park.user_id, already.id);
  }

  const { error: deleteError } = await supabase.from("visited_parks").delete().eq("id", park.id);
  if (deleteError) {
    console.error("Failed to delete park", park.id, deleteError.message);
    continue;
  }
  console.log("Removed park", park.id);
}

console.log("Done.");
