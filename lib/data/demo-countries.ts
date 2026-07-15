import countriesLib from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import type { VisitedCountry } from "@/types/database";

countriesLib.registerLocale(enLocale);

const DEMO_VISITED_CODES = [
  "FR", "IT", "ES", "TR", "DE", "GB", "PT", "GR", "NL", "CH", "AT", "PL", "HR",
  "US", "CA", "MX", "BR", "AR", "CL", "CO",
  "JP", "TH", "VN", "IN", "AE", "KR", "SG", "ID",
  "MA", "EG", "ZA", "KE", "TZ",
  // West Africa
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

export const DEMO_VISITED_COUNTRIES: VisitedCountry[] = DEMO_VISITED_CODES.map(demoCountry);

export const DEMO_VISITED_COUNTRY_CODES = DEMO_VISITED_CODES.map((code) => code.toUpperCase());
