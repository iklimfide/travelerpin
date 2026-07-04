/** Showcase persona for the public homepage demo map. */
export const DEMO_PERSONA = {
  name: "Jennifer",
  username: "jennifer",
  avatarUrl: "/demo/jennifer-avatar.png",
  bio: "Weekend city breaks, national parks, and theme parks — pinning every stop along the way.",
  residence: "Los Angeles",
  instagramUrl: "https://www.instagram.com/jennifer.travels/",
  visitedCountries: 35,
  visitedCities: 124,
  wishlistCountries: 8,
  nationalParks: 10,
  themeParks: 13,
} as const;

export function getDemoTravelStats() {
  return {
    countries: DEMO_PERSONA.visitedCountries,
    cities: DEMO_PERSONA.visitedCities,
    nationalParks: DEMO_PERSONA.nationalParks,
    themeParks: DEMO_PERSONA.themeParks,
  };
}
