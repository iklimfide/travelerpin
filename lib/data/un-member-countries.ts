/**
 * Curated country codes for TravelerPin pickers / YP country list / search.
 *
 * Do NOT dump every ISO dependency here (Heard Island, New Caledonia, …).
 * Add rare traveler destinations to TRAVELER_EXTRA_COUNTRY_CODES only.
 */

/** UN member states + UN observer (Palestine). */
export const UN_MEMBER_COUNTRY_CODES = [
  "AF", "AL", "DZ", "AD", "AO", "AG", "AR", "AM", "AU", "AT", "AZ",
  "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BT", "BO", "BA", "BW", "BR", "BN", "BG", "BF", "BI",
  "CV", "KH", "CM", "CA", "CF", "TD", "CL", "CN", "CO", "KM", "CG", "CD", "CR", "CI", "HR", "CU", "CY", "CZ",
  "DK", "DJ", "DM", "DO",
  "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET",
  "FJ", "FI", "FR",
  "GA", "GM", "GE", "DE", "GH", "GR", "GD", "GT", "GN", "GW", "GY",
  "HT", "HN", "HU",
  "IS", "IN", "ID", "IR", "IQ", "IE", "IL", "IT",
  "JM", "JP", "JO",
  "KZ", "KE", "KI", "KP", "KR", "KW", "KG",
  "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU",
  "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MR", "MU", "MX", "FM", "MD", "MC", "MN", "ME", "MA", "MZ", "MM",
  "NA", "NR", "NP", "NL", "NZ", "NI", "NE", "NG", "MK", "NO",
  "OM",
  "PK", "PS", "PW", "PA", "PG", "PY", "PE", "PH", "PL", "PT",
  "QA",
  "RO", "RU", "RW",
  "KN", "LC", "VC", "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SK", "SI", "SB", "SO", "ZA", "SS", "ES", "LK", "SD", "SR", "SE", "CH", "SY",
  "TJ", "TZ", "TH", "TL", "TG", "TO", "TT", "TN", "TR", "TM", "TV",
  "UG", "UA", "AE", "GB", "US", "UY", "UZ",
  "VU", "VE", "VN",
  "YE",
  "ZM", "ZW",
] as const;

/**
 * Places travelers pin that are not UN member states.
 * Keep this short on purpose.
 */
export const TRAVELER_EXTRA_COUNTRY_CODES = [
  "HK", // Hong Kong
  "KT", // Northern Cyprus (internal code; also in supplementalCountries)
  "MO", // Macau
  "TW", // Taiwan
  "VA", // Vatican
  "XK", // Kosovo
] as const;

const UN_MEMBER_SET = new Set<string>(UN_MEMBER_COUNTRY_CODES);
const TRAVELER_EXTRA_SET = new Set<string>(TRAVELER_EXTRA_COUNTRY_CODES);

export function isUnMemberCountry(code: string): boolean {
  return UN_MEMBER_SET.has(code.toUpperCase());
}

/** Countries/territories shown in pickers, YP country list, and search. */
export function isListedTravelerCountry(code: string): boolean {
  const normalized = code.toUpperCase();
  return UN_MEMBER_SET.has(normalized) || TRAVELER_EXTRA_SET.has(normalized);
}
