import countriesLib from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import trLocale from "i18n-iso-countries/langs/tr.json";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import { getUkNationName } from "@/lib/data/uk-nations";

countriesLib.registerLocale(enLocale);
countriesLib.registerLocale(trLocale);

/** Short display labels (e.g. USA, UK) — ISO library aliases used when not listed here. */
const COUNTRY_ALIAS_OVERRIDES_EN: Partial<Record<string, string>> = {
  US: "USA",
};

const COUNTRY_ALIAS_OVERRIDES_TR: Partial<Record<string, string>> = {
  US: "ABD",
};

/** Full display name overrides when the ISO label is not what travelers use day to day. */
const COUNTRY_NAME_OVERRIDES_EN: Partial<Record<string, string>> = {
  VA: "Vatican",
  KT: "Northern Cyprus",
  MK: "Macedonia",
  CD: "DR Congo",
  FM: "Micronesia",
  KR: "South Korea",
  KP: "North Korea",
};

const COUNTRY_NAME_OVERRIDES_TR: Partial<Record<string, string>> = {
  VA: "Vatikan",
  KT: "Kuzey Kıbrıs",
  MK: "Makedonya",
  CD: "DR Kongo",
  FM: "Mikronezya",
  KR: "Güney Kore",
  KP: "Kuzey Kore",
  US: "ABD",
  GB: "Birleşik Krallık",
  AE: "BAE",
  CZ: "Çekya",
  NL: "Hollanda",
};

/** Extra tokens for search — common abbreviations and alternate names (both locales). */
const COUNTRY_SEARCH_EXTRA: Partial<Record<string, readonly string[]>> = {
  US: ["america", "u.s.", "u.s.a.", "united states", "abd", "amerika"],
  GB: ["great britain", "britain", "ingiltere", "birlesik krallik"],
  NL: ["holland", "hollanda"],
  KR: ["south korea", "korea", "guney kore"],
  KP: ["dprk", "kuzey kore"],
  CZ: ["czech republic", "cekyo", "cekya"],
  CD: ["drc", "dr congo", "kongo"],
  CG: ["congo brazzaville"],
  MK: ["macedonia", "north macedonia", "makedonya"],
  CI: ["ivory coast", "fildisi sahili"],
  MM: ["burma"],
  LA: ["laos"],
  TL: ["east timor"],
  SZ: ["swaziland"],
  VA: ["vatican", "vatikan"],
  SY: ["syria", "suriye"],
  BA: ["bosnia", "bosna"],
  FM: ["micronesia", "mikronezya"],
  HK: ["hong kong"],
  MO: ["macau", "macao"],
  TR: ["turkiye", "turkey"],
  AE: ["emirates", "bae"],
  DO: ["dominican republic"],
  GM: ["gambia"],
  BO: ["bolivia"],
  TZ: ["tanzania"],
  PS: ["palestine", "filistin"],
  TW: ["taiwan", "tayvan"],
  KT: ["kktc", "trnc", "kuzey kibris", "kuzey kıbrıs", "north cyprus"],
};

/** All ISO countries — never filtered by population. */
export type CountryOption = {
  code: string;
  name: string;
  searchText: string;
};

function isoLang(locale: Locale): "en" | "tr" {
  return locale === "tr" ? "tr" : "en";
}

function nameOverrides(locale: Locale): Partial<Record<string, string>> {
  return locale === "tr" ? COUNTRY_NAME_OVERRIDES_TR : COUNTRY_NAME_OVERRIDES_EN;
}

function aliasOverrides(locale: Locale): Partial<Record<string, string>> {
  return locale === "tr" ? COUNTRY_ALIAS_OVERRIDES_TR : COUNTRY_ALIAS_OVERRIDES_EN;
}

function formatCountryLabel(alias: string): string {
  return alias;
}

/** Strip official prefixes/suffixes travelers rarely use in everyday speech (EN). */
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

function resolveCountryDisplayName(
  code: string,
  official: string,
  locale: Locale
): string {
  const override = nameOverrides(locale)[code];
  if (override) return override;

  const alias = countryAlias(code, official, locale);
  if (locale === "tr") {
    return formatCountryLabel(alias).replace(/\s*\([^)]*\)\s*$/u, "").trim() || alias;
  }
  return simplifyCountryDisplayName(formatCountryLabel(alias));
}

function countryAlias(code: string, official: string, locale: Locale): string {
  const override = aliasOverrides(locale)[code];
  if (override) return override;
  const lang = isoLang(locale);
  return (
    countriesLib.getName(code, lang, { select: "alias" }) ??
    countriesLib.getName(code, lang) ??
    official
  );
}

function countrySearchText(
  code: string,
  displayName: string,
  officialEn: string,
  officialTr: string
): string {
  const extras = COUNTRY_SEARCH_EXTRA[code] ?? [];
  return `${displayName} ${officialEn} ${officialTr} ${code} ${extras.join(" ")}`
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function buildCountryOption(code: string, locale: Locale): CountryOption {
  const lang = isoLang(locale);
  const officialEn =
    countriesLib.getName(code, "en", { select: "official" }) ?? code;
  const officialTr =
    countriesLib.getName(code, "tr", { select: "official" }) ??
    countriesLib.getName(code, "tr") ??
    officialEn;
  const official =
    countriesLib.getName(code, lang, { select: "official" }) ??
    countriesLib.getName(code, lang) ??
    officialEn;
  const name = resolveCountryDisplayName(code, official, locale);
  const searchText = countrySearchText(code, name, officialEn, officialTr);

  return { code, name, searchText };
}

/** Non-ISO destinations we still list for travelers (internal alpha-2 codes). */
function supplementalCountries(locale: Locale): CountryOption[] {
  const name = locale === "tr" ? "Kuzey Kıbrıs" : "Northern Cyprus";
  return [
    {
      code: "KT",
      name,
      searchText: countrySearchText(
        "KT",
        name,
        "Turkish Republic of Northern Cyprus",
        "Kuzey Kıbrıs Türk Cumhuriyeti"
      ),
    },
  ];
}

const countryListCache = new Map<Locale, CountryOption[]>();

/** Locale-aware country picker list (ISO + supplemental). UK nations stay separate. */
export function getCountryList(locale: Locale = defaultLocale): CountryOption[] {
  const cached = countryListCache.get(locale);
  if (cached) return cached;

  const isoCodes = Object.keys(
    countriesLib.getNames("en", { select: "official" })
  );
  const list = [
    ...isoCodes.map((code) => buildCountryOption(code, locale)),
    ...supplementalCountries(locale),
  ].sort((a, b) => a.name.localeCompare(b.name, locale === "tr" ? "tr" : "en"));

  countryListCache.set(locale, list);
  return list;
}

/** @deprecated Prefer getCountryList(locale) — EN snapshot for legacy callers. */
export const COUNTRY_LIST: CountryOption[] = getCountryList("en");

/** Display label for a country code in the given locale. */
export function getCountryName(
  code: string,
  locale: Locale = defaultLocale
): string {
  const normalized = code.toUpperCase();
  const ukName = getUkNationName(normalized);
  if (ukName) {
    if (locale === "tr") {
      const trNames: Record<string, string> = {
        EN: "İngiltere",
        SF: "İskoçya",
        WL: "Galler",
      };
      return trNames[normalized] ?? ukName;
    }
    return ukName;
  }

  const supplemental = supplementalCountries(locale).find(
    (country) => country.code === normalized
  );
  if (supplemental) return supplemental.name;

  const lang = isoLang(locale);
  const official =
    countriesLib.getName(code, lang, { select: "official" }) ??
    countriesLib.getName(code, lang) ??
    countriesLib.getName(code, "en", { select: "official" }) ??
    countriesLib.getName(code, "en") ??
    code;

  return resolveCountryDisplayName(normalized, official, locale);
}

function countrySearchScore(country: CountryOption, query: string): number {
  const q = query
    .trim()
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!q) return 0;

  const code = country.code.toLowerCase();
  const name = country.name
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const tokens = country.searchText.split(/\s+/);

  if (code === q) return 1000;
  if (code.startsWith(q)) return 980;
  if (name === q) return 960;
  if (name.startsWith(q)) return 920;
  if (tokens.some((token) => token === q)) return 880;
  if (tokens.some((token) => token.startsWith(q))) return 800;
  if (country.searchText.includes(q)) return 200;
  return 0;
}

/** Rank countries for typeahead: code/prefix first, mid-string matches last. */
export function rankCountriesForSearch(
  countries: CountryOption[],
  query: string,
  locale: Locale = defaultLocale
): CountryOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return countries;

  return countries
    .map((country) => ({ country, score: countrySearchScore(country, q) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.country.name.localeCompare(b.country.name, locale === "tr" ? "tr" : "en", {
          sensitivity: "base",
        })
    )
    .map((entry) => entry.country);
}

export function searchCountries(
  query: string,
  limit = 12,
  locale: Locale = defaultLocale
): CountryOption[] {
  const q = query.trim();
  if (q.length < 2) return [];

  return rankCountriesForSearch(getCountryList(locale), q, locale).slice(0, limit);
}
