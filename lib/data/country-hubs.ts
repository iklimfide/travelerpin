import rawCountries from "@/data/countries.json";
import rawHomeBestCountries from "@/data/home-best-country-hubs.json";
import { buildCountrySlug } from "@/lib/utils/country-slug";

export type CountryHub = {
  slug: string;
  code: string;
  name: string;
  currency: string;
  plugType: string;
  visaNote: string;
  capital: string;
  language: string;
};

type CountriesFile = {
  countries: Record<string, CountryHub>;
};

const catalog = rawCountries as CountriesFile;
const homeBestCatalog = rawHomeBestCountries as CountriesFile;

const bySlug = new Map<string, CountryHub>();
const byCode = new Map<string, CountryHub>();

for (const hub of Object.values(catalog.countries)) {
  bySlug.set(hub.slug.toLowerCase(), hub);
  byCode.set(hub.code.toUpperCase(), hub);
}

for (const hub of Object.values(homeBestCatalog.countries)) {
  bySlug.set(hub.slug.toLowerCase(), hub);
  byCode.set(hub.code.toUpperCase(), hub);
}

export function getCountryHubBySlug(slug: string): CountryHub | null {
  return bySlug.get(slug.toLowerCase()) ?? null;
}

export function getCountryHubByCode(code: string): CountryHub | null {
  return byCode.get(code.toUpperCase()) ?? null;
}

export function resolveCountryHubSlug(countryCode: string, countryName?: string): string | null {
  const byCodeHub = getCountryHubByCode(countryCode);
  if (byCodeHub) return byCodeHub.slug;

  if (!countryName) return null;

  const slug = buildCountrySlug(countryName);
  const bySlugHub = getCountryHubBySlug(slug);
  if (bySlugHub && bySlugHub.code.toUpperCase() === countryCode.toUpperCase()) {
    return bySlugHub.slug;
  }

  return null;
}

export function listCountryHubSlugs(): string[] {
  return [...bySlug.keys()].sort((a, b) => a.localeCompare(b));
}

export function listCountryHubs(): CountryHub[] {
  return listCountryHubSlugs()
    .map((slug) => bySlug.get(slug)!)
    .filter(Boolean);
}
