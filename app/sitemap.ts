import type { MetadataRoute } from "next";
import { findCityHubSlug, getCityHubBySlug } from "@/lib/data/city-hubs";
import { getCountryHubByCode } from "@/lib/data/country-hubs";
import { findParkHubSlug, getParkHubBySlug } from "@/lib/data/park-hubs";
import {
  cityPath,
  countryPath,
  getSiteUrl,
  parkPath,
  profilePath,
} from "@/lib/seo/site";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { buildCitySlug } from "@/lib/utils/city-slug";
import { buildParkSlug } from "@/lib/utils/park-slug";

export const revalidate = 3600;

/** Homepage lastmod — fixed, not stamped on every request. */
const HOME_LAST_MODIFIED = new Date("2025-05-18T12:00:00.000Z");
const PIN_PAGE_SIZE = 1000;
const HUB_PRIORITY = 0.6;

function laterDate(current: Date | null, iso: string | null | undefined): Date | null {
  if (!iso) return current;
  const next = new Date(iso);
  if (Number.isNaN(next.getTime())) return current;
  if (!current || next > current) return next;
  return current;
}

function rememberDate(map: Map<string, Date>, key: string, iso: string | null | undefined): void {
  const stamp = laterDate(map.get(key) ?? null, iso);
  if (stamp) map.set(key, stamp);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function citySitemapSlug(countryCode: string, cityName: string): string | null {
  const catalogSlug = findCityHubSlug(countryCode, cityName);
  if (catalogSlug) {
    const hub = getCityHubBySlug(catalogSlug);
    if (hub) {
      const canonical = buildCitySlug(hub.name);
      return canonical || null;
    }
  }
  const fallback = buildCitySlug(cityName);
  return fallback || null;
}

function parkSitemapSlug(parkName: string, countryCode: string): string | null {
  const catalogSlug = findParkHubSlug(parkName, countryCode);
  const hub = catalogSlug ? getParkHubBySlug(catalogSlug) : null;
  if (hub) {
    const canonical = buildParkSlug(hub.name);
    return canonical || null;
  }
  const fallback = buildParkSlug(parkName);
  return fallback || null;
}

function countrySitemapSlug(countryCode: string): string | null {
  const slug = getCountryHubByCode(countryCode)?.slug.trim().toLowerCase() ?? "";
  return slug || null;
}

type PinSitemapData = {
  lastPinAt: Map<string, Date>;
  cityLastmod: Map<string, Date>;
  parkLastmod: Map<string, Date>;
  countryLastmod: Map<string, Date>;
};

async function loadPinSitemapData(
  supabase: NonNullable<ReturnType<typeof createPublicSupabaseClient>>,
  bannedUserIds: Set<string>
): Promise<PinSitemapData> {
  const lastPinAt = new Map<string, Date>();
  const cityLastmod = new Map<string, Date>();
  const parkLastmod = new Map<string, Date>();
  const countryLastmod = new Map<string, Date>();

  async function pageRows(
    table: "visited_countries" | "visited_cities" | "visited_parks",
    columns: string
  ): Promise<Record<string, unknown>[]> {
    const rows: Record<string, unknown>[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .range(from, from + PIN_PAGE_SIZE - 1);

      if (error) {
        console.error(`sitemap ${table}:`, error.message);
        return rows;
      }

      const page = (data ?? []) as unknown as Record<string, unknown>[];
      rows.push(...page);
      if (page.length < PIN_PAGE_SIZE) break;
      from += PIN_PAGE_SIZE;
    }
    return rows;
  }

  const [countryRows, cityRows, parkRows] = await Promise.all([
    pageRows("visited_countries", "user_id, country_code, created_at"),
    pageRows("visited_cities", "user_id, city_name, country_code, updated_at"),
    pageRows("visited_parks", "user_id, park_name, country_code, updated_at"),
  ]);

  for (const row of countryRows) {
    const userId = asString(row.user_id);
    if (!userId || bannedUserIds.has(userId)) continue;
    const iso = asString(row.created_at) || null;
    rememberDate(lastPinAt, userId, iso);
    const countrySlug = countrySitemapSlug(asString(row.country_code));
    if (countrySlug) rememberDate(countryLastmod, countrySlug, iso);
  }

  for (const row of cityRows) {
    const userId = asString(row.user_id);
    if (!userId || bannedUserIds.has(userId)) continue;
    const iso = asString(row.updated_at) || null;
    rememberDate(lastPinAt, userId, iso);
    const code = asString(row.country_code);
    const citySlug = citySitemapSlug(code, asString(row.city_name));
    if (citySlug) rememberDate(cityLastmod, citySlug, iso);
    const countrySlug = countrySitemapSlug(code);
    if (countrySlug) rememberDate(countryLastmod, countrySlug, iso);
  }

  for (const row of parkRows) {
    const userId = asString(row.user_id);
    if (!userId || bannedUserIds.has(userId)) continue;
    const iso = asString(row.updated_at) || null;
    rememberDate(lastPinAt, userId, iso);
    const code = asString(row.country_code);
    const parkSlug = parkSitemapSlug(asString(row.park_name), code);
    if (parkSlug) rememberDate(parkLastmod, parkSlug, iso);
    const countrySlug = countrySitemapSlug(code);
    if (countrySlug) rememberDate(countryLastmod, countrySlug, iso);
  }

  return { lastPinAt, cityLastmod, parkLastmod, countryLastmod };
}

function hubEntries(
  siteUrl: string,
  pathFor: (slug: string) => string,
  lastmodBySlug: Map<string, Date>
): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const [slug, lastModified] of lastmodBySlug) {
    entries.push({
      url: `${siteUrl}${pathFor(slug)}`,
      lastModified,
      changeFrequency: "weekly",
      priority: HUB_PRIORITY,
    });
  }
  entries.sort((a, b) => a.url.localeCompare(b.url));
  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: HOME_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  const supabase = createPublicSupabaseClient();
  if (!supabase) return entries;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, created_at, banned_at");

  if (error) {
    console.error("sitemap profiles:", error.message);
    return entries;
  }

  const bannedUserIds = new Set<string>();
  for (const profile of profiles ?? []) {
    if (profile.banned_at && typeof profile.id === "string") {
      bannedUserIds.add(profile.id);
    }
  }

  const { lastPinAt, cityLastmod, parkLastmod, countryLastmod } = await loadPinSitemapData(
    supabase,
    bannedUserIds
  );

  const profileEntries: MetadataRoute.Sitemap = [];
  for (const profile of profiles ?? []) {
    if (profile.banned_at) continue;
    const username = typeof profile.username === "string" ? profile.username.trim() : "";
    if (!username) continue;
    const pinDate = lastPinAt.get(profile.id);
    if (!pinDate) continue;

    profileEntries.push({
      url: `${siteUrl}${profilePath(username)}`,
      lastModified: laterDate(pinDate, profile.created_at) ?? pinDate,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  profileEntries.sort((a, b) => a.url.localeCompare(b.url));

  return [
    ...entries,
    ...profileEntries,
    ...hubEntries(siteUrl, cityPath, cityLastmod),
    ...hubEntries(siteUrl, parkPath, parkLastmod),
    ...hubEntries(siteUrl, countryPath, countryLastmod),
  ];
}
