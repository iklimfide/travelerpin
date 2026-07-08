import countriesLib from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countriesLib.registerLocale(enLocale);

/** Short display labels (e.g. USA, UK) — ISO library aliases used when not listed here. */
const COUNTRY_ALIAS_OVERRIDES: Partial<Record<string, string>> = {
  US: "USA",
};

/** Full display name overrides when the ISO label is not what travelers use day to day. */
const COUNTRY_NAME_OVERRIDES: Partial<Record<string, string>> = {
  VA: "Vatican",
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
  MK: ["macedonia"],
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
};

/** All ISO countries — never filtered by population. */
export type CountryOption = {
  code: string;
  name: string;
  searchText: string;
};

function formatCountryLabel(alias: string, official: string): string {
  if (alias.toLowerCase() === official.toLowerCase()) {
    return alias;
  }
  return `${alias} (${official})`;
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
  if (override) {
    const official =
      countriesLib.getName(code, "en", { select: "official" }) ?? code;
    const searchText = countrySearchText(code, override, official, override);
    return { code, name: override, searchText };
  }

  const official =
    countriesLib.getName(code, "en", { select: "official" }) ?? code;
  const alias = countryAlias(code, official);
  const name = formatCountryLabel(alias, official);
  const searchText = countrySearchText(code, alias, official, name);

  return { code, name, searchText };
}

export const COUNTRY_LIST: CountryOption[] = Object.keys(
  countriesLib.getNames("en", { select: "official" })
)
  .map(buildCountryOption)
  .sort((a, b) => a.name.localeCompare(b.name));

/** English display label, e.g. Turkey (Türkiye). */
export function getCountryName(code: string): string {
  const normalized = code.toUpperCase();
  const override = COUNTRY_NAME_OVERRIDES[normalized];
  if (override) return override;

  const official =
    countriesLib.getName(code, "en", { select: "official" }) ??
    countriesLib.getName(code, "en") ??
    code;
  const alias = countryAlias(code, official);
  return formatCountryLabel(alias, official);
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
