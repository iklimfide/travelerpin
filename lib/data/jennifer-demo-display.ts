import { getCountryName } from "@/lib/data/countries";
import { resolveCountryHubSlug } from "@/lib/data/country-hubs";
import { catalogCountryCode, isUkNationCode, UK_LEGACY_CODE } from "@/lib/data/uk-nations";
import { isJenniferShowcaseCountryCode } from "@/lib/data/demo-countries";
import type { Locale } from "@/lib/i18n/config";
import type { TravelStats } from "@/types/database";
import type {
  ProfileAllDestinations,
  ProfileCountryDestination,
} from "@/lib/utils/profile-all-destinations";

export function normalizeJenniferDemoCountryCode(countryCode: string): string {
  const upper = countryCode.trim().toUpperCase();
  if (isUkNationCode(upper)) return UK_LEGACY_CODE;
  return upper;
}

function mergeJenniferDemoCountries(
  countries: ProfileCountryDestination[],
  locale: Locale
): ProfileCountryDestination[] {
  const merged = new Map<string, ProfileCountryDestination>();

  for (const country of countries) {
    const code = catalogCountryCode(normalizeJenniferDemoCountryCode(country.code));
    if (!isJenniferShowcaseCountryCode(code)) continue;

    const name = getCountryName(code, locale);
    const countrySlug = resolveCountryHubSlug(code, name);
    const prev = merged.get(code);
    if (prev) {
      merged.set(code, {
        ...prev,
        cityCount: prev.cityCount + country.cityCount,
        parkCount: prev.parkCount + country.parkCount,
        visitedViaPlacesOnly: prev.visitedViaPlacesOnly && country.visitedViaPlacesOnly,
        visitedId: prev.visitedId ?? country.visitedId,
      });
    } else {
      merged.set(code, {
        ...country,
        code,
        name,
        countrySlug,
      });
    }
  }

  return [...merged.values()].sort((a, b) =>
    a.name.localeCompare(b.name, locale === "tr" ? "tr" : "en")
  );
}

/** Identity counters and Ülkelerim/Şehirlerim tabs use the same numbers on @jennifer. */
export function syncJenniferDemoPresentation(
  stats: TravelStats,
  destinations: ProfileAllDestinations,
  locale: Locale = "en"
): { stats: TravelStats; destinations: ProfileAllDestinations } {
  const countries = mergeJenniferDemoCountries(destinations.countries, locale);

  const alignedStats: TravelStats = {
    ...stats,
    countries: countries.length,
    cities: destinations.cities.length,
  };

  return {
    stats: alignedStats,
    destinations: {
      ...destinations,
      countries,
    },
  };
}

export function normalizeJenniferDemoCountryName(
  countryCode: string,
  locale: Locale = "en"
): string {
  return getCountryName(normalizeJenniferDemoCountryCode(countryCode), locale);
}
