import {
  getCountryList,
  rankCountriesForSearch,
  type CountryOption,
} from "@/lib/data/countries";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import { isListedTravelerCountry } from "@/lib/data/un-member-countries";
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

const UK_NATION_NAMES_TR: Record<string, string> = {
  EN: "İngiltere",
  SF: "İskoçya",
  WL: "Galler",
};

function ukNationOptions(locale: Locale): CountryOption[] {
  if (locale !== "tr") return UK_NATION_OPTIONS;
  return UK_NATION_OPTIONS.map((option) => {
    const name = UK_NATION_NAMES_TR[option.code] ?? option.name;
    return {
      ...option,
      name,
      searchText: `${option.searchText} ${name}`.toLocaleLowerCase("tr"),
    };
  });
}

function sortCountriesByName(
  countries: CountryOption[],
  locale: Locale
): CountryOption[] {
  return [...countries].sort((a, b) =>
    a.name.localeCompare(b.name, locale === "tr" ? "tr" : "en", {
      sensitivity: "base",
    })
  );
}

function isCountryVisited(code: string, visitedCodes: Set<string>): boolean {
  if (isUkNationCode(code)) {
    return isUkNationVisited(code, visitedCodes);
  }
  return visitedCodes.has(code.toUpperCase());
}

export function getAddDestinationCountryList(
  locale: Locale = defaultLocale
): CountryOption[] {
  return [
    ...getCountryList(locale).filter((country) => country.code !== UK_LEGACY_CODE),
    ...ukNationOptions(locale),
  ];
}

/** Same rules as region grouping — used to re-open the right continent after Back. */
export function getAddRegionForCountryCode(countryCode: string): AddRegionId | null {
  const code = countryCode.trim().toUpperCase();
  if (!code) return null;

  if (isUkNationCode(code)) return "europe";
  // Traveler-facing: list with Europe, not Special (not a UN member state).
  if (code === "VA") return "europe";

  const continent = getCountryContinent(code);
  if (continent) {
    const region = CONTINENT_TO_REGION[continent];
    if (region) return region;
  }

  // Curated extras without a continent map fall into Special; junk ISO codes are not listed.
  if (isListedTravelerCountry(code)) return "special";
  return null;
}

export function groupCountriesByRegion(
  locale: Locale = defaultLocale
): Record<AddRegionId, CountryOption[]> {
  const groups: Record<AddRegionId, CountryOption[]> = {
    africa: [],
    asia: [],
    oceania: [],
    europe: [],
    "north-america": [],
    "south-america": [],
    special: [],
  };

  for (const country of getAddDestinationCountryList(locale)) {
    const region = getAddRegionForCountryCode(country.code);
    if (region) {
      groups[region].push(country);
    } else {
      groups.special.push(country);
    }
  }

  for (const region of ADD_REGION_ORDER) {
    groups[region] = sortCountriesByName(groups[region], locale);
  }

  return groups;
}

export function searchCountriesForAdd(
  query: string,
  limit = 60,
  locale: Locale = defaultLocale
): CountryOption[] {
  const q = query.trim();
  if (q.length < 2) return [];

  return rankCountriesForSearch(
    getAddDestinationCountryList(locale),
    q,
    locale
  ).slice(0, limit);
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
