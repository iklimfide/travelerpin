import { getCityCatalog, type CatalogCity } from "@/lib/add/city-catalog";
import { sortCitiesForAddModal } from "@/lib/add/city-list-sort";
import { getCountryCapitalName, matchesCapitalCity } from "@/lib/data/country-capitals";
import { listFeaturedCityHubsForCountry } from "@/lib/data/city-hubs";
import { getPopularCountries } from "@/lib/data/popular-countries";
import { catalogNameKey } from "@/lib/kamikaze/catalog-keys";
import {
  applyCityOverlayToCatalogCities,
  type CatalogOverlaySnapshot,
} from "@/lib/kamikaze/catalog-overlay";
import { matchesPlaceNameSearch } from "@/lib/utils/place-search";

function cityCatalogKey(countryCode: string, cityName: string): string {
  const code = countryCode.toUpperCase();
  return `${code}:${catalogNameKey(cityName, code)}`;
}

/** Featured hub pages (city-hubs.json) that are not yet in the static tourist list. */
function mergeFeaturedCityHubs(
  cities: CatalogCity[],
  countryCode: string,
  query: string
): CatalogCity[] {
  const code = countryCode.toUpperCase();
  const q = query.trim();
  const keys = new Set(cities.map((city) => cityCatalogKey(city.countryCode, city.name)));
  const capitalName = getCountryCapitalName(code);
  const extras: CatalogCity[] = [];

  for (const hub of listFeaturedCityHubsForCountry(code)) {
    const key = cityCatalogKey(code, hub.name);
    if (keys.has(key)) continue;
    if (q.length >= 2 && !matchesPlaceNameSearch(hub.name, q)) continue;

    extras.push({
      countryCode: code,
      name: hub.name,
      latitude: 0,
      longitude: 0,
      highlighted: false,
      isCapital: capitalName ? matchesCapitalCity(hub.name, capitalName) : false,
    });
    keys.add(key);
  }

  if (extras.length === 0) return cities;
  return [...cities, ...extras];
}

/**
 * Single city list for add modal, country hub pages, and destination search —
 * static catalog + YP overlay + featured city hub pages.
 */
export function buildCountryModalCities(
  countryCode: string,
  overlay: CatalogOverlaySnapshot,
  query = ""
): CatalogCity[] {
  const code = countryCode.toUpperCase();
  const catalog = getCityCatalog(code, query);
  const merged = applyCityOverlayToCatalogCities(catalog.allCities, overlay, code, query, {
    includeExtras: true,
  });
  return mergeFeaturedCityHubs(merged, code, query);
}

/** @deprecated Use buildCountryModalCities */
export function listCountryPageCities(countryCode: string, overlay: CatalogOverlaySnapshot) {
  return buildCountryModalCities(countryCode, overlay, "");
}

export function searchModalCitiesInCountries(
  countryCodes: readonly string[],
  overlay: CatalogOverlaySnapshot,
  query: string,
  limit: number
): CatalogCity[] {
  const q = query.trim();
  if (q.length < 2) return [];

  const seen = new Set<string>();
  const results: CatalogCity[] = [];

  for (const rawCode of countryCodes) {
    const code = rawCode.toUpperCase();
    for (const city of buildCountryModalCities(code, overlay, q)) {
      const key = cityCatalogKey(city.countryCode, city.name);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(city);
      if (results.length >= limit) return results;
    }
  }

  return results;
}

/** Curated browse rows for dashboard modals (same catalog as add flow). */
export function listModalBrowseCities(overlay: CatalogOverlaySnapshot, limit = 40): CatalogCity[] {
  const merged: CatalogCity[] = [];
  const seen = new Set<string>();

  for (const country of getPopularCountries(40)) {
    for (const city of buildCountryModalCities(country.code, overlay, "")) {
      const key = cityCatalogKey(city.countryCode, city.name);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(city);
    }
  }

  return sortCitiesForAddModal(merged).slice(0, limit);
}
