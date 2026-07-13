export type ContinentId =
  | "world"
  | "africa"
  | "asia"
  | "europe"
  | "north-america"
  | "south-america"
  | "oceania";

export const CONTINENT_IDS = [
  "world",
  "africa",
  "asia",
  "europe",
  "north-america",
  "south-america",
  "oceania",
] as const satisfies readonly ContinentId[];

/** Default continent for all interactive maps (larger initial view than world). */
export const DEFAULT_MAP_CONTINENT: ContinentId = "europe";

const AFRICA = [
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG", "CD", "CI",
  "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR",
  "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN",
  "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW", "EH",
] as const;

const ASIA = [
  "AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "GE", "IN", "ID", "IR", "IQ",
  "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MY", "MV", "MN", "MM", "NP", "KP",
  "OM", "PK", "PS", "PH", "QA", "SA", "SG", "KR", "LK", "SY", "TW", "TJ", "TH", "TL",
  "TM", "AE", "UZ", "VN", "YE", "RU", "HK", "MO",
] as const;

const EUROPE = [
  "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IS", "IE", "IT", "XK", "KT", "LV", "LI", "LT", "LU", "MT", "MD", "MC",
  "ME", "NL", "MK", "NO", "PL", "PT", "RO", "SM", "RS", "SK", "SI", "ES", "SE", "CH",
  "UA", "GB", "EN", "SF", "WL", "VA", "TR", "FO", "GI", "GG", "JE", "IM", "AX",
] as const;

const NORTH_AMERICA = [
  "US", "CA", "MX", "GT", "BZ", "HN", "SV", "NI", "CR", "PA", "CU", "JM", "HT", "DO",
  "BS", "BB", "TT", "AG", "DM", "GD", "KN", "LC", "VC", "GL", "BM", "PR", "VI", "KY",
  "AW", "CW", "SX", "MQ", "GP", "MF", "BL", "PM", "TC", "VG", "AI", "MS",
] as const;

const SOUTH_AMERICA = [
  "BR", "AR", "CL", "CO", "PE", "VE", "EC", "BO", "PY", "UY", "GY", "SR", "GF", "FK",
] as const;

const OCEANIA = [
  "AU", "NZ", "PG", "FJ", "NC", "SB", "VU", "WS", "TO", "TV", "NR", "PW", "MH", "FM",
  "KI", "AS", "GU", "MP", "PF", "CK", "NU", "NF", "CC", "CX", "TK", "WF", "PN",
] as const;

const COUNTRY_CONTINENT: Record<string, ContinentId> = {};

function register(codes: readonly string[], continent: ContinentId) {
  for (const code of codes) {
    COUNTRY_CONTINENT[code] = continent;
  }
}

register(AFRICA, "africa");
register(ASIA, "asia");
register(EUROPE, "europe");
register(NORTH_AMERICA, "north-america");
register(SOUTH_AMERICA, "south-america");
register(OCEANIA, "oceania");

export function getCountryContinent(code: string): ContinentId | null {
  return COUNTRY_CONTINENT[code.toUpperCase()] ?? null;
}

export function isCountryInContinent(code: string, continent: ContinentId): boolean {
  if (continent === "world") return true;
  return getCountryContinent(code) === continent;
}

export function featureInContinent(
  countryCode: string | null,
  continent: ContinentId
): boolean {
  if (continent === "world") return true;
  if (!countryCode) return false;
  return getCountryContinent(countryCode) === continent;
}
