import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import countries from "world-atlas/countries-110m.json";
import supplementalCountries from "@/lib/data/map/supplemental-countries.json";
import countriesLib from "i18n-iso-countries";
import type { Feature, Geometry, FeatureCollection } from "geojson";
import { featureInContinent, type ContinentId } from "@/lib/map/continents";

/** world-atlas ships some territories without numeric ids (e.g. Kosovo). */
const NAME_ONLY_ATLAS_IDS: Record<string, string> = {
  Kosovo: "983",
};

export type CountryMeta = {
  code: string;
  name: string;
};

export function countryMetaFromFeature(
  feature: Feature<Geometry>
): CountryMeta | null {
  if (feature.id == null || feature.id === "") return null;

  const code = countriesLib.numericToAlpha2(normalizeCountryNumericId(feature.id));
  if (!code) return null;

  const name = countriesLib.getName(code, "en") ?? code;
  return { code, name };
}

export function findCountryFeatureByCode(
  features: Feature<Geometry>[],
  code: string,
  continent: ContinentId = "world"
): Feature<Geometry> | undefined {
  const normalized = code.toUpperCase();

  return features.find((feature) => {
    const meta = countryMetaFromFeature(feature);
    if (!meta || meta.code !== normalized) return false;
    return featureInContinent(meta.code, continent);
  });
}

export function normalizeCountryNumericId(id: string | number): string {
  return String(id).padStart(3, "0");
}

export function countryCodesToNumericIds(codes: string[]): Set<string> {
  return new Set(
    codes
      .map((code) => countriesLib.alpha2ToNumeric(code))
      .filter(Boolean)
      .map((id) => normalizeCountryNumericId(id!))
  );
}

export function normalizeAtlasCountryFeature(
  country: Feature<Geometry>
): Feature<Geometry> {
  if (country.id != null && country.id !== "") return country;

  const name = country.properties?.name;
  if (typeof name !== "string") return country;

  const numericId = NAME_ONLY_ATLAS_IDS[name];
  if (!numericId) return country;

  return { ...country, id: numericId };
}

export function buildCountryFeatures(): Feature<Geometry>[] {
  const topology = countries as unknown as Topology<{ countries: GeometryCollection }>;
  const supplementalIds = new Set(
    (supplementalCountries as FeatureCollection).features
      .filter((row) => row.id != null && row.id !== "")
      .map((row) => normalizeCountryNumericId(row.id!))
  );

  const base = feature(topology, topology.objects.countries).features
    .map(normalizeAtlasCountryFeature)
    .filter((row) => {
      if (row.id == null || row.id === "") return false;
      return !supplementalIds.has(normalizeCountryNumericId(row.id));
    });

  const baseIds = new Set(base.map((row) => normalizeCountryNumericId(row.id!)));

  const extras = (supplementalCountries as FeatureCollection).features.filter((row) => {
    if (row.id == null || row.id === "") return false;
    return !baseIds.has(normalizeCountryNumericId(row.id));
  });

  return [...base, ...extras];
}
