import { unstable_cache } from "next/cache";
import { countryPinsCacheTag } from "@/lib/cache/revalidate-country-hub";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { fetchRecentCountryPins } from "@/lib/supabase/country-memory-pins";

export function getCachedRecentCountryPins(
  countryCode: string,
  revalidateSeconds = 120
) {
  const code = countryCode.toUpperCase();

  return unstable_cache(
    async () => {
      const supabase = createPublicSupabaseClient();
      if (!supabase) return [];
      return fetchRecentCountryPins(supabase, code);
    },
    ["country-recent-pins", code],
    {
      revalidate: revalidateSeconds,
      tags: [countryPinsCacheTag(code)],
    }
  )();
}
