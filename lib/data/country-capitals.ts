import capitalsByCountry from "../../scripts/capitals-names.json";
import { normalizeCityKey } from "@/lib/utils/city-name";

const CAPITALS = capitalsByCountry as Record<string, string>;

export function getCountryCapitalName(countryCode: string): string | null {
  return CAPITALS[countryCode.toUpperCase()] ?? null;
}

export function matchesCapitalCity(cityName: string, capitalName: string): boolean {
  const cityKey = normalizeCityKey(cityName);
  const capitalKey = normalizeCityKey(capitalName);

  if (cityKey === capitalKey) return true;

  const cityLower = cityName.toLocaleLowerCase("en");
  const capitalLower = capitalName.toLocaleLowerCase("en");
  if (cityLower.includes(capitalLower) || capitalLower.includes(cityLower)) {
    return true;
  }

  const cityFirst = cityKey.split(/[\s,.-]+/)[0] ?? "";
  const capitalFirst = capitalKey.split(/[\s,.-]+/)[0] ?? "";
  return cityFirst.length >= 4 && cityFirst === capitalFirst;
}
