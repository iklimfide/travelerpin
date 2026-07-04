import {
  findCityHubByName,
  findCityHubSlug,
  getCityHubBySlug,
} from "@/lib/data/city-hubs";
import { getCountryHubByCode, listCountryHubs } from "@/lib/data/country-hubs";
import {
  findTouristCitiesByExactName,
  TOURIST_CITIES,
} from "@/lib/data/tourist-cities";
import { cityPath } from "@/lib/seo/site";
import { buildCitySlug } from "@/lib/utils/city-slug";
import { formatCityDisplayName, normalizeCityKey } from "@/lib/utils/city-name";

export { normalizeCityKey };

export type ResidenceCityPinInput = {
  city_name: string;
  country_code: string;
  country_name: string;
  latitude: number | null;
  longitude: number | null;
};

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
  return resolveResidenceCityPinInput(residence)?.country_code ?? null;
}

/**
 * Resolve a residence label (e.g. "Istanbul" or "Istanbul, Turkey") into a
 * pin payload so the home city can be auto-added to the travel map.
 */
export function resolveResidenceCityPinInput(
  residence: string | null | undefined
): ResidenceCityPinInput | null {
  if (!residence?.trim()) return null;

  const { cityName, countryHint } = parseResidence(residence);
  if (!cityName) return null;

  const hintedCode = countryHint ? resolveCountryCodeFromHint(countryHint) : null;
  let matches = findTouristCitiesByExactName(cityName, hintedCode);
  if (matches.length === 0) {
    matches = findTouristCitiesByExactName(cityName);
  }

  // Fallback: accent/I-fold match (covers İstanbul vs Istanbul, etc.).
  if (matches.length === 0) {
    const needle = normalizeCityKey(cityName);
    matches = TOURIST_CITIES.filter((city) => {
      if (hintedCode && city.countryCode.toUpperCase() !== hintedCode.toUpperCase()) {
        return false;
      }
      return normalizeCityKey(city.name) === needle;
    });
  }

  const city = matches[0];
  if (!city) return null;

  const countryCode = city.countryCode.toUpperCase();
  const countryName =
    getCountryHubByCode(countryCode)?.name ??
    (countryHint?.trim() || countryCode);

  return {
    city_name: formatCityDisplayName(city.name),
    country_code: countryCode,
    country_name: countryName,
    latitude: city.latitude,
    longitude: city.longitude,
  };
}

/** Whether visited cities already include this residence pin. */
export function hasResidenceCityPinned(
  cities: { city_name: string; country_code: string }[],
  residence: string | null | undefined
): boolean {
  const input = resolveResidenceCityPinInput(residence);
  if (!input) return true;

  const code = input.country_code.toUpperCase();
  const name = normalizeCityKey(input.city_name);
  return cities.some(
    (city) =>
      city.country_code.toUpperCase() === code &&
      normalizeCityKey(city.city_name) === name
  );
}

export function resolveResidenceCityHref(residence: string | null | undefined): string | null {
  if (!residence?.trim()) return null;

  const { cityName, countryHint } = parseResidence(residence);
  if (!cityName) return null;

  const slug = pickResidenceCitySlug(cityName, countryHint);
  return slug ? cityPath(slug) : null;
}
