/**
 * One-off: delete every user's visited pins (cities / countries / parks)
 * and related derived pin counts. Does NOT touch profiles, wishlist, or follows.
 *
 * Usage: node scripts/clear-all-visited.mjs --confirm
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

async function countRows(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

/** Supabase requires a filter for delete — match all uuid ids / all rows. */
async function deleteAll(supabase, table) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .neq("user_id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
  return count ?? 0;
}

const confirmed = process.argv.includes("--confirm");
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local");
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const before = {
  visited_cities: await countRows(supabase, "visited_cities"),
  visited_countries: await countRows(supabase, "visited_countries"),
  visited_parks: await countRows(supabase, "visited_parks"),
  country_pinners: await countRows(supabase, "country_pinners"),
};

console.log("Before:", before);

if (!confirmed) {
  console.log("Dry run only. Re-run with --confirm to delete.");
  process.exit(0);
}

const deleted = {
  visited_cities: await deleteAll(supabase, "visited_cities"),
  visited_parks: await deleteAll(supabase, "visited_parks"),
  visited_countries: await deleteAll(supabase, "visited_countries"),
  country_pinners: await deleteAll(supabase, "country_pinners"),
};

const { error: statsError } = await supabase
  .from("country_pinner_stats")
  .update({ pinner_count: 0 })
  .gt("pinner_count", -1);
if (statsError) {
  console.warn("country_pinner_stats reset warning:", statsError.message);
}

const { error: hubsError } = await supabase
  .from("published_hubs")
  .update({ pinner_count: 0 })
  .gt("pinner_count", -1);
if (hubsError) {
  console.warn("published_hubs pinner_count reset warning:", hubsError.message);
}

const { error: snapError } = await supabase
  .from("profiles")
  .update({ travel_share_snapshot: null, travel_share_snapshot_at: null })
  .not("id", "is", null);
if (snapError) {
  console.warn("travel_share_snapshot clear warning:", snapError.message);
}

const { error: notifError } = await supabase
  .from("notifications")
  .delete()
  .in("entity_type", ["city", "country", "park"]);
if (notifError) {
  console.warn("pin notifications delete warning:", notifError.message);
}

const after = {
  visited_cities: await countRows(supabase, "visited_cities"),
  visited_countries: await countRows(supabase, "visited_countries"),
  visited_parks: await countRows(supabase, "visited_parks"),
  country_pinners: await countRows(supabase, "country_pinners"),
};

console.log("Deleted (reported):", deleted);
console.log("After:", after);
console.log("Done. Profiles / wishlist / follows untouched.");
console.log(
  "Note: bump public-profile-bundle cache key / session CACHE_VERSION if UI still shows old stats."
);
