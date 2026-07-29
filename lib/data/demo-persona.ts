import { JENNIFER_MARKETING_STATS } from "@/lib/data/jennifer-marketing-stats";

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
  const { countries, cities, nationalParks, themeParks } = JENNIFER_MARKETING_STATS;
  return { countries, cities, nationalParks, themeParks };
}
