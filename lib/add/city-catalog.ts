import { isPopularTouristCity } from "@/lib/add/popular-cities-by-country";
import trCities from "@/lib/add/tr-cities.json";
import { getCountryCapitalName, matchesCapitalCity } from "@/lib/data/country-capitals";
import { getMajorCitiesForCountry, type MajorCity } from "@/lib/data/major-cities";
import { TOURIST_CITIES, type TouristCity } from "@/lib/data/tourist-cities";
import { canonicalCityKey, canonicalCityName, citiesAreSame } from "@/lib/utils/city-aliases";
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

const METRO_POPULATION: Record<string, number> = {
  "TR:istanbul": 16_000_000,
  "TR:ankara": 5_800_000,
  "TR:izmir": 4_400_000,
  "TR:bursa": 3_200_000,
  "TR:antalya": 2_700_000,
  "TR:adana": 1_800_000,
  "TR:konya": 2_300_000,
  "TR:gaziantep": 2_100_000,
  "NL:amsterdam": 2_500_000,
  "NL:rotterdam": 1_000_000,
  "NL:the hague": 1_050_000,
  "NL:utrecht": 680_000,
  "GB:london": 9_000_000,
  "FR:paris": 11_000_000,
  "DE:berlin": 3_700_000,
  "DE:hamburg": 1_900_000,
  "DE:munich": 1_500_000,
  "DE:cologne": 1_100_000,
  "DE:frankfurt am main": 750_000,
  "ES:madrid": 3_300_000,
  "IT:rome": 2_800_000,
  "US:new york": 8_300_000,
  "US:los angeles": 3_900_000,
  "ZA:pretoria": 2_900_000,
  "ZA:johannesburg": 5_600_000,
  "ZA:cape town": 4_600_000,
  "TH:pattaya": 4_000_000,
  "TH:pattaya city": 4_000_000,
  "TH:muang pattaya": 4_000_000,
  "TH:phuket": 3_900_000,
  "TH:patong": 3_800_000,
  "TH:pa tong": 3_800_000,
};

const TIER1_TOURIST_KEYS = new Set(
  [
    "Bodrum",
    "Kusadasi",
    "Kuşadası",
    "Marmaris",
    "Fethiye",
    "Çeşme",
    "Cesme",
    "Göreme",
    "Goreme",
    "Giethoorn",
    "Delft",
    "Haarlem",
    "Leiden",
    "Maastricht",
    "Utrecht",
    "Pattaya",
    "Phuket",
    "Patong",
  ].map(normalizeCityKey)
);

/** Turkey: only these get the Popular badge (provinces stay unlabelled). */
const TR_POPULAR_CITY_KEYS = new Set(
  ["Fethiye", "Çeşme", "Cesme", "Bodrum", "Marmaris", "Antalya", "Göreme", "Goreme"].map(
    normalizeCityKey
  )
);

const PINNED_AFTER_CAPITAL: Record<string, string[]> = {
  TH: ["Pattaya", "Phuket", "Patong"],
  TR: ["Bodrum", "Marmaris", "Fethiye", "Çeşme", "Göreme", "Kuşadası"],
};

const DE_HAMBURG_DISTRICT_NOISE = new Set(
  ["Wandsbek", "Altona", "Eimsbüttel", "Marienthal", "Barmbek", "Harburg"].map(normalizeCityKey)
);

const CITIES_PER_TIER = 20;

const TOURIST_LIST_NOISE = new Set(
  [
    "Büren",
    "Calden",
    "Weeze",
    "Laage",
    "Memmingen",
    "Schkeuditz",
    "Zirchow",
    "Greven",
    "Rheinmünster",
    "Lohmen",
    "Rinas",
  ].map(normalizeCityKey)
);

type CatalogEntry = {
  city: TouristCity;
  population: number;
  fromTouristList: boolean;
  tier1Boost: boolean;
};

function catalogKey(countryCode: string, cityName: string): string {
  return `${countryCode.toUpperCase()}:${normalizeCityKey(cityName)}`;
}

function dedupeKey(countryCode: string, cityName: string): string {
  return canonicalCityKey(countryCode, cityName);
}

function withCanonicalCatalogCity(code: string, city: TouristCity): TouristCity {
  const name = canonicalCityName(code, city.name);
  if (name === city.name) return city;

  const major = getMajorCitiesForCountry(code).find((entry) => citiesAreSame(code, entry.name, name));
  if (major) {
    return {
      countryCode: code,
      name,
      latitude: major.latitude,
      longitude: major.longitude,
    };
  }

  return { ...city, name };
}

function isTier1TouristBoost(cityName: string): boolean {
  return TIER1_TOURIST_KEYS.has(normalizeCityKey(cityName));
}

function buildParentCityKeys(majors: MajorCity[]): Set<string> {
  return new Set(
    majors.filter((city) => city.population >= 300_000).map((city) => normalizeCityKey(city.name))
  );
}

function isExcludedCity(
  countryCode: string,
  cityName: string,
  parentCityKeys: Set<string>
): boolean {
  const code = countryCode.toUpperCase();
  const key = normalizeCityKey(cityName);

  const hyphenMatch = cityName.match(/^(.+?)[\s-](Nord|Süd|Sud|Mitte|Ost|West|Hordel)$/iu);
  if (hyphenMatch && parentCityKeys.has(normalizeCityKey(hyphenMatch[1]))) {
    return true;
  }

  if (code === "DE" && parentCityKeys.has(normalizeCityKey("Hamburg")) && DE_HAMBURG_DISTRICT_NOISE.has(key)) {
    return true;
  }

  return false;
}

function resolvePopulation(
  countryCode: string,
  cityName: string,
  majorByKey: Map<string, MajorCity>
): number {
  const metro = METRO_POPULATION[catalogKey(countryCode, cityName)];
  if (metro) return metro;

  const major = majorByKey.get(normalizeCityKey(cityName));
  return major?.population ?? 0;
}

function scoreCanonicalName(name: string): number {
  const hasDiacritics = /[^\u0000-\u007f]/u.test(name) ? 10 : 0;
  return hasDiacritics + name.length;
}

function entryPopularityScore(entry: CatalogEntry): number {
  if (entry.tier1Boost) return 3;
  if (isPopularTouristCity(entry.city.countryCode, entry.city.name)) return 2;
  if (entry.fromTouristList && !TOURIST_LIST_NOISE.has(normalizeCityKey(entry.city.name))) return 1;
  return 0;
}

function compareEntries(a: CatalogEntry, b: CatalogEntry): number {
  if (a.population !== b.population) return b.population - a.population;
  const popA = entryPopularityScore(a);
  const popB = entryPopularityScore(b);
  if (popA !== popB) return popB - popA;
  return a.city.name.localeCompare(b.city.name, "tr", { sensitivity: "base" });
}

function compareCatalogCities(
  a: CatalogCity,
  b: CatalogCity,
  populationByKey?: Map<string, number>
): number {
  const popA = populationByKey?.get(catalogKey(a.countryCode, a.name)) ?? 0;
  const popB = populationByKey?.get(catalogKey(b.countryCode, b.name)) ?? 0;

  if (popA !== popB) return popB - popA;
  if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1;
  return a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
}

function buildMajorCityIndex(countryCode: string): Map<string, MajorCity> {
  const index = new Map<string, MajorCity>();
  for (const city of getMajorCitiesForCountry(countryCode)) {
    const key = normalizeCityKey(city.name);
    const existing = index.get(key);
    if (!existing || city.population > existing.population) {
      index.set(key, city);
    }
  }
  return index;
}

function buildTouristNameKeys(countryCode: string): Set<string> {
  const keys = new Set<string>();
  for (const city of TOURIST_CITIES) {
    if (city.countryCode !== countryCode.toUpperCase()) continue;
    keys.add(dedupeKey(countryCode, city.name));
  }
  return keys;
}

function mergeTrCatalogCities(): CatalogEntry[] {
  const majorByKey = buildMajorCityIndex("TR");

  return (trCities as TouristCity[]).map((city) => ({
    city: {
      countryCode: "TR",
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
    },
    fromTouristList: true,
    population: resolvePopulation("TR", city.name, majorByKey),
    tier1Boost: isTier1TouristBoost(city.name),
  }));
}

function mergeCatalogCities(countryCode: string): CatalogEntry[] {
  const code = countryCode.toUpperCase();
  if (code === "TR") {
    return mergeTrCatalogCities();
  }

  const majors = getMajorCitiesForCountry(code);
  const majorByKey = buildMajorCityIndex(code);
  const parentCityKeys = buildParentCityKeys(majors);
  const touristNameKeys = buildTouristNameKeys(code);
  const merged = new Map<string, { city: TouristCity; fromTouristList: boolean }>();

  for (const city of TOURIST_CITIES) {
    if (city.countryCode !== code) continue;
    if (isExcludedCity(code, city.name, parentCityKeys)) continue;

    const key = dedupeKey(code, city.name);
    const canonicalCity = withCanonicalCatalogCity(code, city);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { city: canonicalCity, fromTouristList: true });
      continue;
    }

    if (scoreCanonicalName(canonicalCity.name) > scoreCanonicalName(existing.city.name)) {
      merged.set(key, { city: canonicalCity, fromTouristList: true });
    }
  }

  for (const major of majors) {
    const key = dedupeKey(code, major.name);
    if (merged.has(key)) continue;
    if (isExcludedCity(code, major.name, parentCityKeys)) continue;

    merged.set(key, {
      city: withCanonicalCatalogCity(code, {
        countryCode: code,
        name: major.name,
        latitude: major.latitude,
        longitude: major.longitude,
      }),
      fromTouristList: false,
    });
  }

  return [...merged.values()].map(({ city, fromTouristList }) => ({
    city,
    fromTouristList: fromTouristList || touristNameKeys.has(dedupeKey(code, city.name)),
    population: resolvePopulation(code, city.name, majorByKey),
    tier1Boost: isTier1TouristBoost(city.name),
  }));
}

function isNotableTouristEntry(entry: CatalogEntry): boolean {
  const key = normalizeCityKey(entry.city.name);
  if (TOURIST_LIST_NOISE.has(key)) return false;

  if (entry.city.countryCode.toUpperCase() === "TR") {
    return TR_POPULAR_CITY_KEYS.has(key);
  }

  if (entry.tier1Boost || isPopularTouristCity(entry.city.countryCode, entry.city.name)) {
    return true;
  }

  if (!entry.fromTouristList) return false;
  if (entry.population >= 25_000 && entry.population < 500_000) return true;

  return entry.population === 0;
}

function toCatalogCity(entry: CatalogEntry, countryCode: string): CatalogCity {
  const capitalName = getCountryCapitalName(countryCode);
  const isCapital = capitalName ? matchesCapitalCity(entry.city.name, capitalName) : false;

  return {
    ...entry.city,
    isCapital,
    highlighted: isCapital ? false : isNotableTouristEntry(entry),
  };
}

function ensureCapitalEntry(
  entries: CatalogEntry[],
  countryCode: string,
  majorByKey: Map<string, MajorCity>
): CatalogEntry[] {
  const capitalName = getCountryCapitalName(countryCode);
  if (!capitalName) return entries;

  if (entries.some((entry) => matchesCapitalCity(entry.city.name, capitalName))) {
    return entries;
  }

  const code = countryCode.toUpperCase();
  const major =
    getMajorCitiesForCountry(code).find((city) => matchesCapitalCity(city.name, capitalName)) ??
    getMajorCitiesForCountry(code).find((city) =>
      normalizeCityKey(city.name).startsWith(normalizeCityKey(capitalName).split(/[\s,.-]+/)[0] ?? "")
    );

  if (!major) return entries;

  return [
    ...entries,
    {
      city: {
        countryCode: code,
        name: major.name,
        latitude: major.latitude,
        longitude: major.longitude,
      },
      fromTouristList: false,
      population: major.population,
      tier1Boost: false,
    },
  ];
}

function ensureCapitalInFirstTier(cities: CatalogCity[], capitalName: string | null): CatalogCity[] {
  if (!capitalName || cities.length <= CITIES_PER_TIER) return cities;

  const capitalIndex = cities.findIndex((city) => matchesCapitalCity(city.name, capitalName));
  if (capitalIndex < 0 || capitalIndex < CITIES_PER_TIER) return cities;

  const ordered = [...cities];
  const [capital] = ordered.splice(capitalIndex, 1);
  ordered.splice(CITIES_PER_TIER - 1, 0, capital);
  return ordered;
}

function findCityForPin(cities: CatalogCity[], pinnedName: string, countryCode: string): number {
  const pinnedKey = dedupeKey(countryCode, pinnedName);
  return cities.findIndex((city) => dedupeKey(city.countryCode, city.name) === pinnedKey);
}

function ensurePinnedAfterCapital(cities: CatalogCity[], countryCode: string): CatalogCity[] {
  const pinned = PINNED_AFTER_CAPITAL[countryCode.toUpperCase()];
  if (!pinned?.length) return cities;

  const capitalName = getCountryCapitalName(countryCode);
  const ordered = [...cities];
  let insertAt = 0;

  if (capitalName) {
    const capitalIndex = ordered.findIndex((city) => matchesCapitalCity(city.name, capitalName));
    if (capitalIndex >= 0) insertAt = capitalIndex + 1;
  }

  const pinnedCities: CatalogCity[] = [];
  for (const name of pinned) {
    const index = findCityForPin(ordered, name, countryCode);
    if (index < 0) continue;
    pinnedCities.push({ ...ordered[index], name });
    ordered.splice(index, 1);
  }

  if (pinnedCities.length === 0) return cities;
  ordered.splice(insertAt, 0, ...pinnedCities);
  return ordered;
}

function buildDisplayTiers(entries: CatalogEntry[], countryCode: string): CityTier[] {
  const code = countryCode.toUpperCase();
  const majorByKey = buildMajorCityIndex(code);
  const withCapital = ensureCapitalEntry(entries, code, majorByKey);
  const capitalName = getCountryCapitalName(code);
  const ordered = ensurePinnedAfterCapital(
    ensureCapitalInFirstTier(
      [...withCapital].sort(compareEntries).map((entry) => toCatalogCity(entry, code)),
      capitalName
    ),
    code
  );

  if (ordered.length === 0) return [];

  if (ordered.length <= CITIES_PER_TIER) {
    return [{ level: 1, cities: ordered }];
  }

  const tiers: CityTier[] = [];
  for (let index = 0; index < ordered.length; index += CITIES_PER_TIER) {
    tiers.push({
      level: tiers.length + 1,
      cities: ordered.slice(index, index + CITIES_PER_TIER),
    });
  }

  return tiers;
}

export function getCityCatalog(countryCode: string, query = ""): CityCatalog {
  const code = countryCode.toUpperCase();
  const entries = mergeCatalogCities(code);
  const populationByKey = new Map(
    entries.map((entry) => [catalogKey(code, entry.city.name), entry.population])
  );

  const q = query.trim();
  const filteredEntries =
    q.length >= 2
      ? entries.filter((entry) => matchesPlaceNameSearch(entry.city.name, q))
      : entries;

  const allCities = filteredEntries
    .map((entry) => toCatalogCity(entry, code))
    .sort((a, b) => compareCatalogCities(a, b, populationByKey));

  if (q.length >= 2) {
    return {
      tiers: allCities.length > 0 ? [{ level: 1, cities: allCities }] : [],
      allCities,
    };
  }

  return {
    tiers: buildDisplayTiers(filteredEntries, code),
    allCities,
  };
}
