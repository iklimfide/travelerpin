/**
 * Reproduces WorldMap compactProfile pipeline and prints Balkan path stats.
 */
import { createRequire } from "node:module";
import { geoArea, geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countries110 from "world-atlas/countries-110m.json" with { type: "json" };
import supplemental from "../lib/data/map/supplemental-countries.json" with { type: "json" };

const require = createRequire(import.meta.url);
const i18n = require("i18n-iso-countries");

const EUROPE = [
  "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IS", "IE", "IT", "XK", "LV", "LI", "LT", "LU", "MT", "MD", "MC",
  "ME", "NL", "MK", "NO", "PL", "PT", "RO", "SM", "RS", "SK", "SI", "ES", "SE", "CH",
  "UA", "GB", "VA", "TR", "FO", "GI", "GG", "JE", "IM", "AX",
];
const AFRICA = [
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG", "CD", "CI",
  "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR",
  "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN",
  "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW", "EH",
];
const ASIA = [
  "AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "GE", "IN", "ID", "IR", "IQ",
  "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MY", "MV", "MN", "MM", "NP", "KP",
  "OM", "PK", "PS", "PH", "QA", "SA", "SG", "KR", "LK", "SY", "TW", "TJ", "TH", "TL",
  "TM", "AE", "UZ", "VN", "YE", "RU", "HK", "MO",
];
const NORTH_AMERICA = [
  "US", "CA", "MX", "GT", "BZ", "HN", "SV", "NI", "CR", "PA", "CU", "JM", "HT", "DO",
  "BS", "BB", "TT", "AG", "DM", "GD", "KN", "LC", "VC", "GL", "BM", "PR", "VI", "KY",
  "AW", "CW", "SX", "MQ", "GP", "MF", "BL", "PM", "TC", "VG", "AI", "MS",
];
const SOUTH_AMERICA = [
  "BR", "AR", "CL", "CO", "PE", "VE", "EC", "BO", "PY", "UY", "GY", "SR", "GF", "FK",
];
const OCEANIA = [
  "AU", "NZ", "PG", "FJ", "NC", "SB", "VU", "WS", "TO", "TV", "NR", "PW", "MH", "FM",
  "KI", "AS", "GU", "MP", "PF", "CK", "NU", "NF", "CC", "CX", "TK", "WF", "PN",
];
const COUNTRY_CONTINENT = {};
for (const [list, c] of [
  [AFRICA, "africa"],
  [ASIA, "asia"],
  [EUROPE, "europe"],
  [NORTH_AMERICA, "north-america"],
  [SOUTH_AMERICA, "south-america"],
  [OCEANIA, "oceania"],
]) {
  for (const code of list) COUNTRY_CONTINENT[code] = c;
}

const OCEANIA_MAP_CODES = new Set([
  "AU", "NZ", "PG", "FJ", "NC", "SB", "VU", "WS", "TO", "MH", "FM", "PW", "NR",
]);

const CONTINENT_POLYGON_BOUNDS = {
  africa: [-20, -36, 55, 38],
  europe: [-25, 35, 45, 82],
  asia: [25, -12, 180, 78],
  "north-america": [-172, 12, -50, 84],
  "south-america": [-82, -56, -32, 15],
  oceania: [105, -52, 180, -8],
};
const CONTINENT_CHECK_ORDER = [
  "south-america", "north-america", "oceania", "africa", "europe", "asia",
];
const MULTI_CONTINENT_CODES = {
  RU: ["europe", "asia"], TR: ["europe", "asia"], EG: ["africa", "asia"],
  KZ: ["europe", "asia"], GE: ["europe", "asia"], AZ: ["europe", "asia"],
  CY: ["europe", "asia"], ID: ["asia", "oceania"], PA: ["north-america", "south-america"],
};

function getCountryContinent(code) {
  return COUNTRY_CONTINENT[code] ?? null;
}

function getContinentAtPoint(lng, lat) {
  for (const id of CONTINENT_CHECK_ORDER) {
    const [w, s, e, n] = CONTINENT_POLYGON_BOUNDS[id];
    if (lng >= w && lng <= e && lat >= s && lat <= n) return id;
  }
  return null;
}

function explodePolygonCoords(geometry) {
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function polygonFeature(parent, coordinates) {
  return {
    type: "Feature",
    id: parent.id,
    properties: parent.properties,
    geometry: { type: "Polygon", coordinates },
  };
}

function mergePolygons(parent, polygons) {
  if (!polygons.length) return null;
  if (polygons.length === 1) {
    return { ...parent, geometry: { type: "Polygon", coordinates: polygons[0] } };
  }
  return { ...parent, geometry: { type: "MultiPolygon", coordinates: polygons } };
}

function keepLargestPolygon(parent) {
  const polygons = explodePolygonCoords(parent.geometry);
  if (!polygons.length) return null;
  if (polygons.length === 1) {
    return { ...parent, geometry: { type: "Polygon", coordinates: polygons[0] } };
  }
  let best = polygons[0];
  let bestArea = -1;
  for (const coordinates of polygons) {
    const area = geoArea(polygonFeature(parent, coordinates));
    if (area > bestArea) {
      bestArea = area;
      best = coordinates;
    }
  }
  return { ...parent, geometry: { type: "Polygon", coordinates: best } };
}

function allowedContinents(countryCode) {
  const primary = getCountryContinent(countryCode);
  const extras = MULTI_CONTINENT_CODES[countryCode.toUpperCase()];
  const allowed = new Set();
  if (primary) allowed.add(primary);
  if (extras) extras.forEach((c) => allowed.add(c));
  return allowed;
}

function clipCountryToMainland(country, countryCode) {
  const allowed = allowedContinents(countryCode);
  if (allowed.size === 0) return keepLargestPolygon(country);

  const polygons = explodePolygonCoords(country.geometry);
  const kept = polygons.filter((coordinates) => {
    const [lng, lat] = geoCentroid(polygonFeature(country, coordinates));
    const continent = getContinentAtPoint(lng, lat);
    return continent != null && allowed.has(continent);
  });

  if (!kept.length) return keepLargestPolygon(country);
  return mergePolygons(country, kept);
}

function buildCountryFeatures() {
  const overrideIds = new Set(
    supplemental.features.map((row) => String(row.id).padStart(3, "0"))
  );
  const base = feature(countries110, countries110.objects.countries).features.filter(
    (row) => row.id && !overrideIds.has(String(row.id).padStart(3, "0"))
  );
  return [...base, ...supplemental.features.filter((row) => row.id)];
}

function filterMainlandWorldFeatures(features) {
  return features.filter((country) => {
    const code = i18n.numericToAlpha2(String(country.id).padStart(3, "0"));
    if (!code) return false;
    const continent = getCountryContinent(code);
    if (!continent) return false;
    if (continent === "oceania" && !OCEANIA_MAP_CODES.has(code)) return false;
    return true;
  });
}

function isTiny(bounds) {
  const width = bounds[1][0] - bounds[0][0];
  const height = bounds[1][1] - bounds[0][1];
  return width < 6 && height < 6;
}

const WIDTH = 800;
const HEIGHT = 450;
const BALKANS = ["AL", "BA", "BG", "HR", "XK", "GR", "ME", "MK", "RO", "RS", "SI", "LI", "VA"];

const raw = buildCountryFeatures();
const mainland = [];
for (const country of raw) {
  const code = i18n.numericToAlpha2(String(country.id).padStart(3, "0"));
  if (!code) continue;
  const clipped = clipCountryToMainland(country, code);
  if (clipped) mainland.push(clipped);
}

const visible = filterMainlandWorldFeatures(mainland);
const coll = { type: "FeatureCollection", features: visible };

function fitProjectionFill(projection, width, height, object, padding = 0) {
  const inset = Math.max(0, padding);
  projection.fitExtent(
    [
      [inset, inset],
      [width - inset, height - inset],
    ],
    object
  );
  const path = geoPath(projection);
  const bounds = path.bounds(object);
  const dx = bounds[1][0] - bounds[0][0];
  const dy = bounds[1][1] - bounds[0][1];
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || dx <= 0 || dy <= 0) return projection;
  const innerW = width - inset * 2;
  const innerH = height - inset * 2;
  const scaleX = innerW / dx;
  const scaleY = innerH / dy;
  const fillFactor = Math.max(scaleX, scaleY) / Math.min(scaleX, scaleY);
  projection.scale(projection.scale() * fillFactor);
  const centered = path.bounds(object);
  const cx = (centered[0][0] + centered[1][0]) / 2;
  const cy = (centered[0][1] + centered[1][1]) / 2;
  const [tx, ty] = projection.translate();
  projection.translate([tx + width / 2 - cx, ty + height / 2 - cy]);
  return projection;
}

const proj = fitProjectionFill(geoNaturalEarth1(), WIDTH, HEIGHT, coll, 0);
const pathGen = geoPath(proj);

const rows = [];
visible.forEach((country, index) => {
  const code = i18n.numericToAlpha2(String(country.id).padStart(3, "0"));
  const d = pathGen(country);
  if (!d) return;
  const bounds = pathGen.bounds(country);
  const tiny = isTiny(bounds);
  rows.push({
    index,
    code,
    len: d.length,
    subpaths: (d.match(/M/g) ?? []).length,
    tiny,
    w: bounds[1][0] - bounds[0][0],
    h: bounds[1][1] - bounds[0][1],
    renderedOnProfile: !tiny,
  });
});

console.log("Visible features:", visible.length);
console.log("\nBalkans:");
for (const code of BALKANS) {
  const row = rows.find((r) => r.code === code);
  console.log(row ? JSON.stringify(row) : `${code}: MISSING`);
}
