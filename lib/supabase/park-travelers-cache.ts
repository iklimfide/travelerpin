import { unstable_cache } from "next/cache";
import type { ParkHub } from "@/lib/data/park-hubs";
import { parkPinsCacheTag, parkHubPinsCacheTag } from "@/lib/cache/revalidate-park-hub";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { fetchRecentParkPins, fetchRecentParkTravelers } from "@/lib/supabase/park-travelers";

function parkCacheKey(hub: ParkHub) {
  const code = hub.countryCode.toUpperCase();
  const park = hub.name.trim().toLowerCase();
  return { code, park };
}

export function getCachedRecentParkPins(hub: ParkHub, revalidateSeconds = 120) {
  const { code, park } = parkCacheKey(hub);

  return unstable_cache(
    async () => {
      const supabase = createPublicSupabaseClient();
      if (!supabase) return [];
      return fetchRecentParkPins(supabase, hub);
    },
    ["park-recent-pins", code, park],
    {
      revalidate: revalidateSeconds,
      tags: [parkPinsCacheTag(code, hub.name), parkHubPinsCacheTag(hub.slug)],
    }
  )();
}

export function getCachedRecentParkTravelers(
  hub: ParkHub,
  revalidateSeconds = 120
) {
  const { code, park } = parkCacheKey(hub);

  return unstable_cache(
    async () => {
      const supabase = createPublicSupabaseClient();
      if (!supabase) return [];
      return fetchRecentParkTravelers(supabase, hub);
    },
    ["park-recent-travelers", code, park],
    {
      revalidate: revalidateSeconds,
      tags: [parkPinsCacheTag(code, hub.name), parkHubPinsCacheTag(hub.slug)],
    }
  )();
}
