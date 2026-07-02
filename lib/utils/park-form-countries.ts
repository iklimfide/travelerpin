import type { VisitedCountry, VisitedPark } from "@/types/database";

/** Park edit works even when visited_countries list is empty in session. */
export function countriesForParkForm(
  park: VisitedPark,
  visitedCountries: VisitedCountry[]
): VisitedCountry[] {
  if (visitedCountries.length > 0) return visitedCountries;

  return [
    {
      id: park.country_code,
      user_id: park.user_id,
      country_code: park.country_code,
      country_name: park.country_name,
      created_at: park.created_at,
    },
  ];
}

export function inferParkMediaType(
  mediaType: VisitedPark["media_type"],
  mediaUrl: string | null
): VisitedPark["media_type"] {
  if (mediaType) return mediaType;
  if (!mediaUrl) return null;
  if (mediaUrl.includes("instagram.com")) return "instagram";
  return "photo";
}
