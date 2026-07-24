import rawCities from "@/data/city-hubs.json";
import { searchTouristCities, type TouristCity } from "@/lib/data/tourist-cities";
import { searchTouristParks, type TouristPark } from "@/lib/data/tourist-park-search";
import { getCountryHubByCode, type CountryHub } from "@/lib/data/country-hubs";
import { buildCitySlug } from "@/lib/utils/city-slug";

export type CityHub = {
  slug: string;
  name: string;
  countryCode: string;
  countrySlug: string;
  countryName: string;
  touristCityName?: string;
  heroImage?: string;
  heroImageAlt?: string;
};

type CityHubsFile = {
  cities: Record<string, CityHub>;
};

const catalog = rawCities as CityHubsFile;

const bySlug = new Map<string, CityHub>();
const byCountryAndName = new Map<string, CityHub>();
const featuredSlugs = new Set<string>();

function cityCatalogKey(countryCode: string, cityName: string): string {
  return `${countryCode.toUpperCase()}:${cityName.trim().toLocaleLowerCase("tr")}`;
}

for (const hub of Object.values(catalog.cities)) {
  featuredSlugs.add(hub.slug.toLowerCase());
  bySlug.set(hub.slug.toLowerCase(), hub);
  byCountryAndName.set(cityCatalogKey(hub.countryCode, hub.name), hub);
}

export function getCityHubBySlug(slug: string): CityHub | null {
  return bySlug.get(slug.toLowerCase()) ?? null;
}

export function findCityHubSlug(countryCode: string, cityName: string): string | null {
  return byCountryAndName.get(cityCatalogKey(countryCode, cityName))?.slug ?? null;
}

export function findCityHubByName(cityName: string): CityHub | null {
  const needle = cityName.trim().toLocaleLowerCase("tr");
  if (!needle) return null;

  for (const hub of bySlug.values()) {
    if (hub.name.toLocaleLowerCase("tr") === needle) {
      return hub;
    }
  }

  return null;
}

export function listCityHubSlugs(): string[] {
  return [...featuredSlugs].sort((a, b) => a.localeCompare(b));
}

export function listFeaturedCityHubSlugs(): string[] {
  return listCityHubSlugs();
}

export function listFeaturedCityHubsForCountry(countryCode: string): CityHub[] {
  const code = countryCode.toUpperCase();
  return Object.values(catalog.cities).filter((hub) => hub.countryCode.toUpperCase() === code);
}

export function isFeaturedCityHub(slug: string): boolean {
  return featuredSlugs.has(slug.toLowerCase());
}

export function ensureCityHubFromTouristCity(
  city: TouristCity,
  countryName?: string
): CityHub {
  const catalogHub = byCountryAndName.get(cityCatalogKey(city.countryCode, city.name));
  if (catalogHub) return catalogHub;

  const slug = buildCitySlug(city.name);
  const existing = bySlug.get(slug.toLowerCase());
  if (existing && existing.countryCode === city.countryCode.toUpperCase()) {
    return existing;
  }

  const countryHub = getCountryHubByCode(city.countryCode);
  const hub: CityHub = {
    slug,
    name: city.name,
    countryCode: city.countryCode.toUpperCase(),
    countrySlug: countryHub?.slug ?? city.countryCode.toLowerCase(),
    countryName: countryName ?? countryHub?.name ?? city.countryCode,
  };

  bySlug.set(slug.toLowerCase(), hub);
  byCountryAndName.set(cityCatalogKey(city.countryCode, city.name), hub);
  return hub;
}

export function hubFromCityFields(fields: {
  cityName: string;
  countryCode: string;
  countryName: string;
}): CityHub {
  const touristMatches = searchTouristCities(fields.countryCode, fields.cityName, 5);
  const exact = touristMatches.find(
    (city) => city.name.toLocaleLowerCase("tr") === fields.cityName.trim().toLocaleLowerCase("tr")
  );

  if (exact) {
    return ensureCityHubFromTouristCity(exact, fields.countryName);
  }

  return ensureCityHubFromTouristCity(
    {
      countryCode: fields.countryCode,
      name: fields.cityName,
      latitude: 0,
      longitude: 0,
    },
    fields.countryName
  );
}

export function getCityHubTouristCity(hub: CityHub): TouristCity | null {
  const searchName = hub.touristCityName ?? hub.name;
  const matches = searchTouristCities(hub.countryCode, searchName, 10);
  const exact = matches.find(
    (city) => city.name.toLocaleLowerCase("tr") === searchName.toLocaleLowerCase("tr")
  );
  return exact ?? matches[0] ?? null;
}

export function getCityHubParks(hub: CityHub, limit = 12): TouristPark[] {
  return searchTouristParks(hub.countryCode, hub.name, limit);
}

export type CityHubContext = {
  hub: CityHub;
  touristCity: TouristCity | null;
  countryHub: CountryHub | null;
  parks: TouristPark[];
};

export function getCityHubContext(slug: string): CityHubContext | null {
  const hub = getCityHubBySlug(slug);
  if (!hub) return null;

  return {
    hub,
    touristCity: getCityHubTouristCity(hub),
    countryHub: getCountryHubByCode(hub.countryCode),
    parks: getCityHubParks(hub),
  };
}
