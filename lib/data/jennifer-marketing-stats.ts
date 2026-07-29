/** Frozen Jennifer showcase numbers (homepage, OG card, @jennifer identity). */
export const JENNIFER_MARKETING_STATS = {
  countries: 41,
  cities: 124,
  nationalParks: 10,
  themeParks: 13,
  worldCountryTotal: 195,
} as const;

export function jenniferWorldExploredPercent(): number {
  return Math.round(
    (JENNIFER_MARKETING_STATS.countries / JENNIFER_MARKETING_STATS.worldCountryTotal) * 100
  );
}

export function jenniferCountriesPinnedLabel(): string {
  const { countries, worldCountryTotal } = JENNIFER_MARKETING_STATS;
  return `${countries} of ${worldCountryTotal} countries pinned`;
}
