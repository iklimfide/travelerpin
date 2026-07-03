import {
  findCityHubByName,
  findCityHubSlug,
  getCityHubBySlug,
} from "@/lib/data/city-hubs";
import { getCountryHubByCode, listCountryHubs } from "@/lib/data/country-hubs";
import { findTouristCitiesByExactName } from "@/lib/data/tourist-cities";
import { cityPath } from "@/lib/seo/site";
import { buildCitySlug } from "@/lib/utils/city-slug";

function parseResidence(residence: string): {
  cityName: string;
  countryHint: string | null;
} {
  const parts = residence
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      cityName: parts[0],
      countryHint: parts.slice(1).join(", "),
    };
  }

  return { cityName: residence.trim(), countryHint: null };
}

function resolveCountryCodeFromHint(hint: string): string | null {
  const normalized = hint.trim().toLowerCase();
  if (!normalized) return null;

  const aliases: Record<string, string> = {
    turkiye: "TR",
    türkiye: "TR",
    usa: "US",
    "united states": "US",
    "united states of america": "US",
    uk: "GB",
    "united kingdom": "GB",
    "great britain": "GB",
  };
  if (aliases[normalized]) {
    return aliases[normalized];
  }

  if (normalized.length === 2) {
    return getCountryHubByCode(normalized.toUpperCase())?.code ?? null;
  }

  for (const hub of listCountryHubs()) {
    if (hub.name.toLowerCase() === normalized) return hub.code;
    if (hub.slug === normalized.replace(/\s+/g, "-")) return hub.code;
  }

  return null;
}

function cityHubSlugForName(cityName: string, countryCode?: string | null): string | null {
  const byName = findCityHubByName(cityName);
  if (byName) return byName.slug;

  const bySlug = getCityHubBySlug(buildCitySlug(cityName));
  if (bySlug) return bySlug.slug;

  if (countryCode) {
    const slug = findCityHubSlug(countryCode, cityName);
    if (slug) return slug;
  }

  return null;
}

function pickResidenceCitySlug(cityName: string, countryHint: string | null): string | null {
  const hintedCountryCode = countryHint ? resolveCountryCodeFromHint(countryHint) : null;
  const directSlug = cityHubSlugForName(cityName, hintedCountryCode);
  if (directSlug) return directSlug;

  const touristMatches = findTouristCitiesByExactName(cityName, hintedCountryCode);
  for (const touristCity of touristMatches) {
    const slug = cityHubSlugForName(touristCity.name, touristCity.countryCode);
    if (slug) return slug;
  }

  if (!hintedCountryCode) {
    const globalMatches = findTouristCitiesByExactName(cityName);
    for (const touristCity of globalMatches) {
      const slug = cityHubSlugForName(touristCity.name, touristCity.countryCode);
      if (slug) return slug;
    }
  }

  return null;
}

/** Country code for the profile owner's home base (from residence field). */
export function resolveResidenceCountryCode(
  residence: string | null | undefined
): string | null {
  if (!residence?.trim()) return null;

  const { cityName, countryHint } = parseResidence(residence);
  if (countryHint) {
    const fromHint = resolveCountryCodeFromHint(countryHint);
    if (fromHint) return fromHint.toUpperCase();
  }

  if (!cityName) return null;

  const hintedCode = countryHint ? resolveCountryCodeFromHint(countryHint) : null;
  const matches = findTouristCitiesByExactName(cityName, hintedCode);
  if (matches.length > 0) {
    return matches[0].countryCode.toUpperCase();
  }

  return null;
}

export function resolveResidenceCityHref(residence: string | null | undefined): string | null {
  if (!residence?.trim()) return null;

  const { cityName, countryHint } = parseResidence(residence);
  if (!cityName) return null;

  const slug = pickResidenceCitySlug(cityName, countryHint);
  return slug ? cityPath(slug) : null;
}
