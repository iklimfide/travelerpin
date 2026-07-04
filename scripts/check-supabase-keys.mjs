import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
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
  env[key] = value.trim();
}

function jwtPayload(token) {
  try {
    const part = token.split(".")[1];
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

console.log("url", url);
console.log("anon role", jwtPayload(anon)?.role, "ref", jwtPayload(anon)?.ref);
console.log("service role", jwtPayload(service)?.role, "ref", jwtPayload(service)?.ref);

const anonClient = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: anonData, error: anonError } = await anonClient
  .from("profiles")
  .select("id, username, residence")
  .eq("username", "fitalya")
  .maybeSingle();
console.log("anon read", anonData, anonError?.message);

const serviceClient = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: serviceData, error: serviceError } = await serviceClient
  .from("profiles")
  .select("id, username, residence")
  .eq("username", "fitalya")
  .maybeSingle();
console.log("service read", serviceData, serviceError?.message);
