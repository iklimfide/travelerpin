import cities from "all-the-cities";
import fs from "fs";
import path from "path";
import { LIMITS } from "../lib/constants";

const MIN_POPULATION = LIMITS.minCityPopulation;
const COUNTRY_MIN_POPULATION = LIMITS.countryMinCityPopulation as Record<string, number>;
const COUNTRY_KEEP_CITIES = LIMITS.countryKeepCities as Record<string, readonly string[]>;

function getMinCityPopulationForCountry(countryCode: string, cityCount: number): number {
  if (COUNTRY_MIN_POPULATION[countryCode] != null) return COUNTRY_MIN_POPULATION[countryCode];
  if (cityCount >= LIMITS.largeCityCatalogMinCount) return LIMITS.largeCityCatalogMinPopulation;
  return MIN_POPULATION;
}

function cityMeetsCatalogPopulation(
  countryCode: string,
  name: string,
  population: number,
  minPopulation: number
): boolean {
  if (population >= minPopulation) return true;
  const keep = COUNTRY_KEEP_CITIES[countryCode];
  if (!keep) return false;
  const key = name.trim().toLowerCase();
  return keep.some((item) => item.toLowerCase() === key);
}

const grouped: Record<
  string,
  Array<{ name: string; latitude: number; longitude: number; population: number }>
> = {};

for (const city of cities) {
  if (city.population < MIN_POPULATION) continue;
  const code = city.country;
  if (!grouped[code]) grouped[code] = [];
  grouped[code].push({
    name: city.name,
    latitude: city.loc.coordinates[1],
    longitude: city.loc.coordinates[0],
    population: city.population,
  });
}

const out: Record<
  string,
  Array<{ name: string; latitude: number; longitude: number; population: number }>
> = {};

for (const code of Object.keys(grouped)) {
  const min = getMinCityPopulationForCountry(code, grouped[code].length);
  const kept = grouped[code].filter((city) =>
    cityMeetsCatalogPopulation(code, city.name, city.population, min)
  );
  if (kept.length > 0) out[code] = kept;
}

for (const code of Object.keys(out)) {
  out[code].sort((a, b) => b.population - a.population || a.name.localeCompare(b.name));
}

const target = path.join(process.cwd(), "lib/data/major-cities.json");
fs.writeFileSync(target, JSON.stringify(out));

const total = Object.values(out).flat().length;
console.log(`Wrote ${Object.keys(out).length} countries, ${total} cities to ${target}`);
