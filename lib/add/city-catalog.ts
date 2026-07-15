import { getCountryCapitalName, matchesCapitalCity } from "@/lib/data/country-capitals";
import { TOURIST_CITIES, type TouristCity } from "@/lib/data/tourist-cities";
import { canonicalCityKey, canonicalCityName } from "@/lib/utils/city-aliases";
import { normalizeCityKey } from "@/lib/utils/city-name";
import { matchesPlaceNameSearch } from "@/lib/utils/place-search";

export type CatalogCity = TouristCity & {
  highlighted: boolean;
  isCapital: boolean;
};

export type CityTier = {
  level: number;
  cities: CatalogCity[];
};

export type CityCatalog = {
  tiers: CityTier[];
  allCities: CatalogCity[];
};

/** Single runtime city list: `TOURIST_CITIES` (+ YP overlay applied in API). */
const CITIES_PER_TIER = 20;

const DE_HAMBURG_DISTRICT_NOISE = new Set(
  ["Wandsbek", "Altona", "Eimsbüttel", "Marienthal", "Barmbek", "Harburg"].map(normalizeCityKey)
);

function dedupeKey(countryCode: string, cityName: string): string {
  return canonicalCityKey(countryCode, cityName);
}

function scoreCanonicalName(name: string): number {
  const hasDiacritics = /[^\u0000-\u007f]/u.test(name) ? 10 : 0;
  return hasDiacritics + name.length;
}

function isExcludedCity(countryCode: string, cityName: string): boolean {
  const code = countryCode.toUpperCase();
  const key = normalizeCityKey(cityName);

  // District/suburb noise for a few parent cities (name-based, not a second catalog).
  if (code === "DE" && DE_HAMBURG_DISTRICT_NOISE.has(key)) return true;

  const hyphenMatch = cityName.match(/^(.+?)[\s-](Nord|Süd|Sud|Mitte|Ost|West|Hordel)$/iu);
  if (hyphenMatch && normalizeCityKey(hyphenMatch[1]).length >= 4) {
    // Drop "City-Nord" style twins when the bare parent already exists in the same country list.
    const parentKey = normalizeCityKey(hyphenMatch[1]);
    const hasParent = TOURIST_CITIES.some(
      (city) =>
        city.countryCode === code && normalizeCityKey(city.name) === parentKey
    );
    if (hasParent) return true;
  }

  return false;
}

function citiesForCountry(countryCode: string): TouristCity[] {
  const code = countryCode.toUpperCase();
  const merged = new Map<string, TouristCity>();

  for (const city of TOURIST_CITIES) {
    if (city.countryCode !== code) continue;
    if (isExcludedCity(code, city.name)) continue;

    const key = dedupeKey(code, city.name);
    const next: TouristCity = {
      countryCode: code,
      name: canonicalCityName(code, city.name),
      latitude: city.latitude,
      longitude: city.longitude,
    };
    const existing = merged.get(key);
    if (!existing || scoreCanonicalName(next.name) > scoreCanonicalName(existing.name)) {
      merged.set(key, next);
    }
  }

  return [...merged.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
  );
}

function toCatalogCity(city: TouristCity, countryCode: string): CatalogCity {
  const capitalName = getCountryCapitalName(countryCode);
  const isCapital = capitalName ? matchesCapitalCity(city.name, capitalName) : false;

  return {
    ...city,
    isCapital,
    // Popular badge/sort comes only from YP overrides in /api/cities/tourist.
    highlighted: false,
  };
}

function buildTiers(cities: CatalogCity[]): CityTier[] {
  if (cities.length === 0) return [];
  if (cities.length <= CITIES_PER_TIER) {
    return [{ level: 1, cities }];
  }

  const tiers: CityTier[] = [];
  for (let index = 0; index < cities.length; index += CITIES_PER_TIER) {
    tiers.push({
      level: tiers.length + 1,
      cities: cities.slice(index, index + CITIES_PER_TIER),
    });
  }
  return tiers;
}

export function getCityCatalog(countryCode: string, query = ""): CityCatalog {
  const code = countryCode.toUpperCase();
  const catalogCities = citiesForCountry(code).map((city) => toCatalogCity(city, code));

  const q = query.trim();
  const allCities =
    q.length >= 2
      ? catalogCities.filter((city) => matchesPlaceNameSearch(city.name, q))
      : catalogCities;

  return {
    tiers: q.length >= 2
      ? allCities.length > 0
        ? [{ level: 1, cities: allCities }]
        : []
      : buildTiers(allCities),
    allCities,
  };
}
