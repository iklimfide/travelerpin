import countriesLib from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { getUkNationName } from "@/lib/data/uk-nations";

countriesLib.registerLocale(enLocale);

/** Short display labels (e.g. USA, UK) — ISO library aliases used when not listed here. */
const COUNTRY_ALIAS_OVERRIDES: Partial<Record<string, string>> = {
  US: "USA",
};

/** Full display name overrides when the ISO label is not what travelers use day to day. */
const COUNTRY_NAME_OVERRIDES: Partial<Record<string, string>> = {
  VA: "Vatican",
  KT: "Northern Cyprus",
  MK: "Macedonia",
  CD: "DR Congo",
  FM: "Micronesia",
  KR: "South Korea",
  KP: "North Korea",
};

/** Extra tokens for search — common abbreviations and alternate names. */
const COUNTRY_SEARCH_EXTRA: Partial<Record<string, readonly string[]>> = {
  US: ["america", "u.s.", "u.s.a.", "united states"],
  GB: ["great britain", "britain"],
  NL: ["holland"],
  KR: ["south korea", "korea"],
  KP: ["dprk"],
  CZ: ["czech republic"],
  CD: ["drc", "dr congo"],
  CG: ["congo brazzaville"],
  MK: ["macedonia", "north macedonia"],
  CI: ["ivory coast"],
  MM: ["burma"],
  LA: ["laos"],
  TL: ["east timor"],
  SZ: ["swaziland"],
  VA: ["vatican"],
  SY: ["syria"],
  BA: ["bosnia"],
  FM: ["micronesia"],
  HK: ["hong kong"],
  MO: ["macau", "macao"],
  TR: ["turkiye"],
  AE: ["emirates"],
  DO: ["dominican republic"],
  GM: ["gambia"],
  BO: ["bolivia"],
  TZ: ["tanzania"],
  PS: ["palestine"],
  TW: ["taiwan"],
  KT: ["kktc", "trnc", "kuzey kibris", "kuzey kıbrıs", "north cyprus"],
};

/** All ISO countries — never filtered by population. */
export type CountryOption = {
  code: string;
  name: string;
  searchText: string;
};

function formatCountryLabel(alias: string, _official: string): string {
  return alias;
}

/** Strip official prefixes/suffixes travelers rarely use in everyday speech. */
function simplifyCountryDisplayName(name: string): string {
  let result = name.trim();

  const replacements: Array<[RegExp, string]> = [
    [/^the /i, ""],
    [/^the republic of /i, ""],
    [/^republic of the /i, ""],
    [/^republic of /i, ""],
    [/^islamic republic of /i, ""],
    [/^democratic republic of the /i, ""],
    [/^democratic republic of /i, ""],
    [/^people's democratic republic of /i, ""],
    [/^syrian arab republic$/i, "Syria"],
    [/^lao people's democratic republic$/i, "Laos"],
    [/^korea, republic of$/i, "South Korea"],
    [/, republic of$/i, ""],
    [/, federated states of$/i, ""],
    [/\s*\([^)]*\)\s*$/u, ""],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement).trim();
  }

  return result || name;
}

function resolveCountryDisplayName(code: string, official: string): string {
  const override = COUNTRY_NAME_OVERRIDES[code];
  if (override) return override;

  const alias = countryAlias(code, official);
  return simplifyCountryDisplayName(formatCountryLabel(alias, official));
}

function countryAlias(code: string, official: string): string {
  return COUNTRY_ALIAS_OVERRIDES[code] ?? countriesLib.getName(code, "en", { select: "alias" }) ?? official;
}

function countrySearchText(code: string, alias: string, official: string, name: string): string {
  const extras = COUNTRY_SEARCH_EXTRA[code] ?? [];
  return `${alias} ${official} ${name} ${code} ${extras.join(" ")}`.toLowerCase();
}

function buildCountryOption(code: string): CountryOption {
  const override = COUNTRY_NAME_OVERRIDES[code];
  const official =
    countriesLib.getName(code, "en", { select: "official" }) ?? code;
  const name = resolveCountryDisplayName(code, official);
  const alias = countryAlias(code, official);
  const searchText = countrySearchText(
    code,
    override ?? alias,
    official,
    name
  );

  return { code, name, searchText };
}

/** Non-ISO destinations we still list for travelers (internal alpha-2 codes). */
const SUPPLEMENTAL_COUNTRIES: CountryOption[] = [
  {
    code: "KT",
    name: "Northern Cyprus",
    searchText: countrySearchText(
      "KT",
      "Northern Cyprus",
      "Turkish Republic of Northern Cyprus",
      "Northern Cyprus"
    ),
  },
];

export const COUNTRY_LIST: CountryOption[] = [
  ...Object.keys(countriesLib.getNames("en", { select: "official" })).map(buildCountryOption),
  ...SUPPLEMENTAL_COUNTRIES,
].sort((a, b) => a.name.localeCompare(b.name));

/** English display label — common short name (e.g. Iran, Turkey, USA). */
export function getCountryName(code: string): string {
  const normalized = code.toUpperCase();
  const ukName = getUkNationName(normalized);
  if (ukName) return ukName;

  const supplemental = SUPPLEMENTAL_COUNTRIES.find((country) => country.code === normalized);
  if (supplemental) return supplemental.name;

  const official =
    countriesLib.getName(code, "en", { select: "official" }) ??
    countriesLib.getName(code, "en") ??
    code;

  return resolveCountryDisplayName(normalized, official);
}

function countrySearchScore(country: CountryOption, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const code = country.code.toLowerCase();
  const tokens = country.searchText.split(/\s+/);

  if (code === q) return 1000;
  if (tokens.includes(q)) return 950;
  if (country.name.toLowerCase().startsWith(q)) return 900;
  if (tokens.some((token) => token.startsWith(q))) return 700;
  if (country.searchText.includes(q)) return 500;
  return 0;
}

export function searchCountries(query: string, limit = 12): CountryOption[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  return COUNTRY_LIST.map((country) => ({
    country,
    score: countrySearchScore(country, q),
  }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.country.name.localeCompare(b.country.name, undefined, { sensitivity: "base" })
    )
    .slice(0, limit)
    .map((entry) => entry.country);
}
