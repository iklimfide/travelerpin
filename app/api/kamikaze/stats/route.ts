import { NextResponse } from "next/server";
import { getCountryName } from "@/lib/data/countries";
import {
  requireAdminClient,
  requireKamikazeMasterApi,
} from "@/lib/kamikaze/auth";

export async function GET() {
  const gate = await requireKamikazeMasterApi();
  if ("response" in gate) return gate.response;

  const adminGate = requireAdminClient();
  if ("response" in adminGate) return adminGate.response;
  const { admin } = adminGate;

  const { data: countryStats, error: countryError } = await admin
    .from("country_pinner_stats")
    .select("country_code, pinner_count")
    .gt("pinner_count", 0)
    .order("pinner_count", { ascending: false });

  if (countryError) {
    return NextResponse.json({ error: countryError.message }, { status: 400 });
  }

  // Distinct user counts via RPC-free aggregation: fetch pin rows and aggregate in JS.
  // For admin V1 this is acceptable; volumes are modest.
  const [{ data: cityRows, error: cityError }, { data: parkRows, error: parkError }] =
    await Promise.all([
      admin.from("visited_cities").select("user_id, country_code, city_name"),
      admin.from("visited_parks").select("user_id, country_code, park_name, park_type"),
    ]);

  if (cityError) {
    return NextResponse.json({ error: cityError.message }, { status: 400 });
  }
  if (parkError) {
    return NextResponse.json({ error: parkError.message }, { status: 400 });
  }

  const cityMap = new Map<string, { countryCode: string; cityName: string; users: Set<string> }>();
  for (const row of cityRows ?? []) {
    const countryCode = String(row.country_code ?? "").toUpperCase();
    const cityName = String(row.city_name ?? "");
    const key = `${countryCode}:${cityName.toLocaleLowerCase("tr")}`;
    let entry = cityMap.get(key);
    if (!entry) {
      entry = { countryCode, cityName, users: new Set() };
      cityMap.set(key, entry);
    }
    if (row.user_id) entry.users.add(String(row.user_id));
  }

  const cities = [...cityMap.values()]
    .map((entry) => ({
      countryCode: entry.countryCode,
      countryName: getCountryName(entry.countryCode),
      cityName: entry.cityName,
      pinnerCount: entry.users.size,
    }))
    .filter((row) => row.pinnerCount > 0)
    .sort((a, b) => b.pinnerCount - a.pinnerCount || a.cityName.localeCompare(b.cityName));

  const parkMap = new Map<
    string,
    {
      countryCode: string;
      parkName: string;
      parkType: string;
      users: Set<string>;
    }
  >();
  for (const row of parkRows ?? []) {
    const countryCode = String(row.country_code ?? "").toUpperCase();
    const parkName = String(row.park_name ?? "");
    const parkType = String(row.park_type ?? "");
    const key = `${countryCode}:${parkType}:${parkName.toLocaleLowerCase("tr")}`;
    let entry = parkMap.get(key);
    if (!entry) {
      entry = { countryCode, parkName, parkType, users: new Set() };
      parkMap.set(key, entry);
    }
    if (row.user_id) entry.users.add(String(row.user_id));
  }

  const parks = [...parkMap.values()]
    .map((entry) => ({
      countryCode: entry.countryCode,
      countryName: getCountryName(entry.countryCode),
      parkName: entry.parkName,
      parkType: entry.parkType,
      pinnerCount: entry.users.size,
    }))
    .filter((row) => row.pinnerCount > 0)
    .sort((a, b) => b.pinnerCount - a.pinnerCount || a.parkName.localeCompare(b.parkName));

  return NextResponse.json({
    countries: (countryStats ?? [])
      .map((row) => ({
        countryCode: String(row.country_code).toUpperCase(),
        countryName: getCountryName(String(row.country_code)),
        pinnerCount: Number(row.pinner_count) || 0,
      }))
      .filter((row) => row.pinnerCount > 0),
    cities,
    parks,
  });
}
