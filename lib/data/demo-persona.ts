/** Homepage sample persona — travel pins sync from @guvencgiller (see jennifer-demo-travel). */
export const DEMO_PERSONA = {
  name: "Jennifer",
  username: "jennifer",
  avatarUrl: "/demo/jennifer-avatar.webp",
  bio: "Weekend city breaks, Natura&Parks, and theme parks — pinning every stop along the way.",
  residence: "Los Angeles",
  instagramUrl: "https://www.instagram.com/jennifer.travels/",
} as const;

export function getDemoTravelStats() {
  return {
    countries: 41,
    cities: 124,
    nationalParks: 10,
    themeParks: 13,
  };
}
