import countriesLib from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { isUkNationCode, UK_LEGACY_CODE } from "@/lib/data/uk-nations";
import type { VisitedCountry } from "@/types/database";

countriesLib.registerLocale(enLocale);

/** Jennifer demo map fill (41 countries) + share-card PNG showcase. */
const DEMO_MAP_SHOWCASE_CODES = [
  "FR", "IT", "ES", "TR", "DE", "GB", "PT", "GR", "NL", "CH", "AT", "PL", "HR",
  "US", "CA", "MX", "BR", "AR", "CL", "CO",
  "JP", "TH", "VN", "IN", "AE", "KR", "SG", "ID",
  "MA", "EG", "ZA", "KE", "TZ",
  "SN", "GH", "NG", "CI", "ML",
  "RU",
  "AU", "NZ",
] as const;

function demoCountry(code: string): VisitedCountry {
  return {
    id: `demo-${code.toLowerCase()}`,
    user_id: "demo",
    country_code: code,
    country_name: countriesLib.getName(code, "en") ?? code,
    created_at: "",
  };
}

export const DEMO_MAP_SHOWCASE_COUNTRY_CODES = DEMO_MAP_SHOWCASE_CODES.map((code) =>
  code.toUpperCase()
);
export const DEMO_MAP_SHOWCASE_COUNTRIES: VisitedCountry[] =
  DEMO_MAP_SHOWCASE_COUNTRY_CODES.map((code) => demoCountry(code));

export const DEMO_VISITED_COUNTRY_CODES = DEMO_MAP_SHOWCASE_COUNTRY_CODES;
export const DEMO_VISITED_COUNTRIES: VisitedCountry[] = DEMO_MAP_SHOWCASE_COUNTRIES;

const SHOWCASE_COUNTRY_CODE_SET = new Set(DEMO_MAP_SHOWCASE_COUNTRY_CODES);

export function isJenniferShowcaseCountryCode(countryCode: string): boolean {
  const upper = countryCode.trim().toUpperCase();
  if (SHOWCASE_COUNTRY_CODE_SET.has(upper)) return true;
  if (isUkNationCode(upper) && SHOWCASE_COUNTRY_CODE_SET.has(UK_LEGACY_CODE)) return true;
  return false;
}
