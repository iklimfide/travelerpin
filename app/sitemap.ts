import type { MetadataRoute } from "next";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { getSiteUrl, profilePath } from "@/lib/seo/site";

export const revalidate = 3600;

/** Homepage lastmod — fixed, not stamped on every request. */
const HOME_LAST_MODIFIED = new Date("2025-05-18T12:00:00.000Z");
const PIN_PAGE_SIZE = 1000;

function laterDate(current: Date | null, iso: string | null | undefined): Date | null {
  if (!iso) return current;
  const next = new Date(iso);
  if (Number.isNaN(next.getTime())) return current;
  if (!current || next > current) return next;
  return current;
}

async function loadLastPinDates(
  supabase: NonNullable<ReturnType<typeof createPublicSupabaseClient>>
): Promise<Map<string, Date>> {
  const lastPinAt = new Map<string, Date>();

  async function consume(
    table: "visited_countries" | "visited_cities",
    dateColumn: "created_at" | "updated_at"
  ) {
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from(table)
        .select(`user_id, ${dateColumn}`)
        .range(from, from + PIN_PAGE_SIZE - 1);

      if (error) {
        console.error(`sitemap ${table}:`, error.message);
        return;
      }

      const rows = data ?? [];
      for (const row of rows) {
        const userId = typeof row.user_id === "string" ? row.user_id : "";
        if (!userId) continue;
        const stamp = laterDate(
          lastPinAt.get(userId) ?? null,
          typeof row[dateColumn] === "string" ? row[dateColumn] : null
        );
        if (stamp) lastPinAt.set(userId, stamp);
      }

      if (rows.length < PIN_PAGE_SIZE) break;
      from += PIN_PAGE_SIZE;
    }
  }

  await Promise.all([
    consume("visited_countries", "created_at"),
    consume("visited_cities", "updated_at"),
  ]);

  return lastPinAt;
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

  const lastPinAt = await loadLastPinDates(supabase);
  if (lastPinAt.size === 0) return entries;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, created_at, banned_at");

  if (error) {
    console.error("sitemap profiles:", error.message);
    return entries;
  }

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
  return [...entries, ...profileEntries];
}
