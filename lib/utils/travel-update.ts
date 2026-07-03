import type {
  TravelStats,
  VisitedCity,
  VisitedCountry,
  VisitedPark,
} from "@/types/database";
import { worldCoveragePercent } from "@/lib/utils/profile-page";

export type TravelShareSnapshot = {
  stats: TravelStats;
  visitedCountryCodes: string[];
  savedAt: string;
};

export type TravelUpdateCountry = {
  code: string;
  name: string;
};

export type TravelUpdateDelta = {
  hasChanges: boolean;
  countriesDelta: number;
  citiesDelta: number;
  parksDelta: number;
  newCountries: TravelUpdateCountry[];
  currentStats: TravelStats;
  worldPercent: number;
};

function normalizeCodes(codes: string[]): Set<string> {
  return new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean));
}

function resolveCountryName(
  code: string,
  visitedCountries: VisitedCountry[],
  visitedCities: VisitedCity[],
  visitedParks: VisitedPark[]
): string {
  const upper = code.toUpperCase();
  const fromCountry = visitedCountries.find((c) => c.country_code.toUpperCase() === upper);
  if (fromCountry) return fromCountry.country_name;
  const fromCity = visitedCities.find((c) => c.country_code.toUpperCase() === upper);
  if (fromCity) return fromCity.country_name;
  const fromPark = visitedParks.find((p) => p.country_code.toUpperCase() === upper);
  if (fromPark) return fromPark.country_name;
  return upper;
}

export function buildTravelShareSnapshot(
  stats: TravelStats,
  visitedCountryCodes: string[]
): TravelShareSnapshot {
  return {
    stats: { ...stats },
    visitedCountryCodes: [...new Set(visitedCountryCodes.map((c) => c.toUpperCase()))].sort(),
    savedAt: new Date().toISOString(),
  };
}

export function parseTravelShareSnapshot(value: unknown): TravelShareSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const stats = row.stats;
  const codes = row.visitedCountryCodes;
  const savedAt = row.savedAt;
  if (!stats || typeof stats !== "object" || !Array.isArray(codes) || typeof savedAt !== "string") {
    return null;
  }
  const s = stats as Record<string, unknown>;
  if (
    typeof s.countries !== "number" ||
    typeof s.cities !== "number" ||
    typeof s.nationalParks !== "number" ||
    typeof s.themeParks !== "number"
  ) {
    return null;
  }
  return {
    stats: {
      countries: s.countries,
      cities: s.cities,
      nationalParks: s.nationalParks,
      themeParks: s.themeParks,
    },
    visitedCountryCodes: codes.filter((c): c is string => typeof c === "string"),
    savedAt,
  };
}

export function computeTravelUpdateDelta(
  snapshot: TravelShareSnapshot | null,
  stats: TravelStats,
  visitedCountryCodes: string[],
  visitedCountries: VisitedCountry[],
  visitedCities: VisitedCity[],
  visitedParks: VisitedPark[]
): TravelUpdateDelta {
  const currentStats = stats;
  const worldPercent = worldCoveragePercent(stats.countries);

  if (!snapshot) {
    return {
      hasChanges: false,
      countriesDelta: 0,
      citiesDelta: 0,
      parksDelta: 0,
      newCountries: [],
      currentStats,
      worldPercent,
    };
  }

  const countriesDelta = Math.max(0, stats.countries - snapshot.stats.countries);
  const citiesDelta = Math.max(0, stats.cities - snapshot.stats.cities);
  const previousParks = snapshot.stats.nationalParks + snapshot.stats.themeParks;
  const currentParks = stats.nationalParks + stats.themeParks;
  const parksDelta = Math.max(0, currentParks - previousParks);

  const snapshotCodes = normalizeCodes(snapshot.visitedCountryCodes);
  const currentCodes = normalizeCodes(visitedCountryCodes);
  const newCountries = [...currentCodes]
    .filter((code) => !snapshotCodes.has(code))
    .map((code) => ({
      code,
      name: resolveCountryName(code, visitedCountries, visitedCities, visitedParks),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const hasChanges = countriesDelta > 0 || citiesDelta > 0 || parksDelta > 0;

  return {
    hasChanges,
    countriesDelta,
    citiesDelta,
    parksDelta,
    newCountries,
    currentStats,
    worldPercent,
  };
}

/** Delta used for post-pin share prompts. No snapshot yet counts as a first share. */
export function computeSharePromptDelta(
  snapshot: TravelShareSnapshot | null,
  stats: TravelStats,
  visitedCountryCodes: string[],
  visitedCountries: VisitedCountry[],
  visitedCities: VisitedCity[],
  visitedParks: VisitedPark[]
): TravelUpdateDelta {
  if (snapshot) {
    return computeTravelUpdateDelta(
      snapshot,
      stats,
      visitedCountryCodes,
      visitedCountries,
      visitedCities,
      visitedParks
    );
  }

  const parksDelta = stats.nationalParks + stats.themeParks;
  const hasChanges = stats.countries > 0 || stats.cities > 0 || parksDelta > 0;
  const newCountries = visitedCountries
    .map((country) => ({
      code: country.country_code.toUpperCase(),
      name: country.country_name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    hasChanges,
    countriesDelta: stats.countries,
    citiesDelta: stats.cities,
    parksDelta,
    newCountries,
    currentStats: stats,
    worldPercent: worldCoveragePercent(stats.countries),
  };
}

export function buildTravelUpdateShareText(
  displayName: string,
  delta: TravelUpdateDelta,
  username: string,
  shareUrl: string
): string {
  const parts: string[] = [];
  if (delta.countriesDelta > 0) {
    parts.push(
      `+${delta.countriesDelta} ${delta.countriesDelta === 1 ? "country" : "countries"}`
    );
  }
  if (delta.citiesDelta > 0) {
    parts.push(`+${delta.citiesDelta} ${delta.citiesDelta === 1 ? "city" : "cities"}`);
  }
  if (delta.parksDelta > 0) {
    parts.push(`+${delta.parksDelta} ${delta.parksDelta === 1 ? "park" : "parks"}`);
  }

  const statsLine = `${delta.worldPercent}% of the world explored · ${delta.currentStats.countries} countries · ${delta.currentStats.cities} cities`;

  if (!delta.hasChanges) {
    return `${displayName}'s travel map on TravelerPin.\n\n${statsLine}\n\n${shareUrl}`;
  }

  const growthLine = parts.join(", ");
  const countryNames = delta.newCountries.map((c) => c.name).join(", ");
  const newLine =
    countryNames.length > 0 ? `\nNew countries: ${countryNames}` : "";

  return `${displayName}'s travel map grew — ${growthLine} since the last share.${newLine}\n\n${statsLine}\n\n${shareUrl}`;
}
