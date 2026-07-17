import { COUNTRY_LIST, rankCountriesForSearch, type CountryOption } from "@/lib/data/countries";
import { isUnMemberCountry } from "@/lib/data/un-member-countries";
import { getCountryContinent, type ContinentId } from "@/lib/map/continents";
import {
  isUkNationCode,
  isUkNationVisited,
  UK_LEGACY_CODE,
  UK_NATION_OPTIONS,
} from "@/lib/data/uk-nations";

export type AddRegionId =
  | "africa"
  | "asia"
  | "oceania"
  | "europe"
  | "north-america"
  | "south-america"
  | "special";

export const ADD_REGION_ORDER: AddRegionId[] = [
  "europe",
  "north-america",
  "asia",
  "africa",
  "south-america",
  "oceania",
  "special",
];

export const ADD_REGION_EMOJI: Record<AddRegionId, string> = {
  africa: "🐘",
  asia: "🛕",
  oceania: "🦘",
  europe: "🏛️",
  "north-america": "🌲",
  "south-america": "🦜",
  special: "🧊",
};

export const ADD_REGION_BROWN_EMOJI = new Set<AddRegionId>(["africa", "oceania"]);

const CONTINENT_TO_REGION: Record<ContinentId, AddRegionId | null> = {
  world: null,
  africa: "africa",
  asia: "asia",
  oceania: "oceania",
  europe: "europe",
  "north-america": "north-america",
  "south-america": "south-america",
};

function sortCountriesByName(countries: CountryOption[]): CountryOption[] {
  return [...countries].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

function isCountryVisited(code: string, visitedCodes: Set<string>): boolean {
  if (isUkNationCode(code)) {
    return isUkNationVisited(code, visitedCodes);
  }
  return visitedCodes.has(code.toUpperCase());
}

export function getAddDestinationCountryList(): CountryOption[] {
  return [
    ...COUNTRY_LIST.filter((country) => country.code !== UK_LEGACY_CODE),
    ...UK_NATION_OPTIONS,
  ];
}

/** Same rules as region grouping — used to re-open the right continent after Back. */
export function getAddRegionForCountryCode(countryCode: string): AddRegionId | null {
  const code = countryCode.trim().toUpperCase();
  if (!code) return null;

  if (isUkNationCode(code)) return "europe";
  if (!isUnMemberCountry(code)) return "special";

  const continent = getCountryContinent(code);
  return continent ? CONTINENT_TO_REGION[continent] : "special";
}

export function groupCountriesByRegion(): Record<AddRegionId, CountryOption[]> {
  const groups: Record<AddRegionId, CountryOption[]> = {
    africa: [],
    asia: [],
    oceania: [],
    europe: [],
    "north-america": [],
    "south-america": [],
    special: [],
  };

  for (const country of getAddDestinationCountryList()) {
    const region = getAddRegionForCountryCode(country.code);
    if (region) {
      groups[region].push(country);
    } else {
      groups.special.push(country);
    }
  }

  for (const region of ADD_REGION_ORDER) {
    groups[region] = sortCountriesByName(groups[region]);
  }

  return groups;
}

export function searchCountriesForAdd(query: string, limit = 60): CountryOption[] {
  const q = query.trim();
  if (q.length < 2) return [];

  return rankCountriesForSearch(getAddDestinationCountryList(), q).slice(0, limit);
}

export function regionCountryCounts(
  regionId: AddRegionId,
  visitedCodes: Set<string>,
  groups: Record<AddRegionId, CountryOption[]>
): { visited: number; total: number } {
  const countries = groups[regionId];
  const visited = countries.filter((country) =>
    isCountryVisited(country.code, visitedCodes)
  ).length;

  return { visited, total: countries.length };
}

export function regionHasVisitedCountries(
  regionId: AddRegionId,
  visitedCodes: Set<string>,
  groups: Record<AddRegionId, CountryOption[]>
): boolean {
  return groups[regionId].some((country) => isCountryVisited(country.code, visitedCodes));
}
