import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { geoArea } from "d3-geo";
import { feature } from "topojson-client";
import polygonClipping from "polygon-clipping";
import countries110 from "world-atlas/countries-110m.json" with { type: "json" };
import countries50 from "world-atlas/countries-50m.json" with { type: "json" };

const require = createRequire(import.meta.url);
const countriesLib = require("i18n-iso-countries");
countriesLib.registerLocale(require("i18n-iso-countries/langs/en.json"));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** ISO codes referenced in lib/map/continents.ts */
const WANTED_CODES = new Set([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG", "CD", "CI", "DJ", "EG",
  "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML",
  "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD",
  "TZ", "TG", "TN", "UG", "ZM", "ZW", "EH", "AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN",
  "GE", "IN", "ID", "IR", "IQ", "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MY", "MV", "MN",
  "MM", "NP", "KP", "OM", "PK", "PS", "PH", "QA", "SA", "SG", "KR", "LK", "SY", "TW", "TJ", "TH",
  "TL", "TM", "AE", "UZ", "VN", "YE", "RU", "HK", "MO", "AL", "AD", "AT", "BY", "BE", "BA", "BG",
  "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT", "XK", "LV", "LI",
  "LT", "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO", "SM", "RS", "SK", "SI",
  "ES", "SE", "CH", "UA", "GB", "VA", "TR", "FO", "GI", "GG", "JE", "IM", "AX", "US", "CA", "MX",
  "GT", "BZ", "HN", "SV", "NI", "CR", "PA", "CU", "JM", "HT", "DO", "BS", "BB", "TT", "AG", "DM",
  "GD", "KN", "LC", "VC", "GL", "BM", "PR", "VI", "KY", "AW", "CW", "SX", "MQ", "GP", "MF", "BL",
  "PM", "TC", "VG", "AI", "MS", "BR", "AR", "CL", "CO", "PE", "VE", "EC", "BO", "PY", "UY", "GY",
  "SR", "GF", "FK", "AU", "NZ", "PG", "FJ", "NC", "SB", "VU", "WS", "TO", "TV", "NR", "PW", "MH",
  "FM", "KI", "AS", "GU", "MP", "PF", "CK", "NU", "NF", "CC", "CX", "TK", "WF", "PN",
]);

/** 110m atlas is too coarse here — replace with 50m polygons for clear borders. */
const BALKAN_HIGH_RES_CODES = new Set([
  "AL", "BA", "BG", "HR", "ME", "MK", "RS", "SI", "XK",
]);

const f110 = feature(countries110, countries110.objects.countries).features;
const f50 = feature(countries50, countries50.objects.countries).features;
const ids110 = new Set(f110.map((row) => String(row.id).padStart(3, "0")));

function padId(id) {
  return String(id).padStart(3, "0");
}

function codeForFeature(row) {
  if (row.id == null || row.id === "") return null;
  return countriesLib.numericToAlpha2(padId(row.id));
}

function findByName(features, name) {
  return features.find((row) => row.properties?.name === name);
}

function findByCode(features, code) {
  return features.find((row) => codeForFeature(row) === code);
}

function geometryToMultiPolygon(geometry) {
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function multiPolygonToGeometry(multiPolygon) {
  if (multiPolygon.length === 0) return null;
  if (multiPolygon.length === 1) {
    return { type: "Polygon", coordinates: multiPolygon[0] };
  }
  return { type: "MultiPolygon", coordinates: multiPolygon };
}

function featureArea(geometry) {
  return geoArea({ type: "Feature", properties: {}, geometry });
}

function signedRingArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    area += (x2 - x1) * (y2 + y1);
  }
  return area;
}

function alignPolygonWinding(multiPolygon, referenceRing) {
  const refSign = Math.sign(signedRingArea(referenceRing));
  if (refSign === 0) return multiPolygon;

  return multiPolygon.map((polygon) =>
    polygon.map((ring, ringIndex) => {
      const sign = Math.sign(signedRingArea(ring));
      const wanted = ringIndex === 0 ? refSign : -refSign;
      return sign === wanted ? ring : [...ring].reverse();
    })
  );
}

function subtractGeometry(subject, clip) {
  const subjectMulti = geometryToMultiPolygon(subject);
  const clipMulti = geometryToMultiPolygon(clip);
  const result = polygonClipping.difference(subjectMulti, clipMulti);
  const referenceRing = subjectMulti[0]?.[0];
  if (!referenceRing || result.length === 0) return null;

  const aligned = alignPolygonWinding(result, referenceRing);
  const geometry = multiPolygonToGeometry(aligned);
  if (!geometry) return null;

  const subjectArea = featureArea(subject);
  const resultArea = featureArea(geometry);
  if (resultArea > subjectArea * 1.5) {
    throw new Error("Polygon difference produced inverted geometry (area too large)");
  }

  return geometry;
}

function toFeature(row, id, name) {
  return {
    type: "Feature",
    id,
    properties: { name: name ?? row.properties?.name ?? id },
    geometry: row.geometry,
  };
}

const supplemental = f50
  .filter((row) => {
    const code = codeForFeature(row);
    if (!code || !WANTED_CODES.has(code)) return false;
    return !ids110.has(padId(row.id));
  })
  .map((row) => toFeature(row, row.id));

const overrideIds = new Set();

function addOverride(featureRow, reason) {
  const id = padId(featureRow.id);
  if (overrideIds.has(id)) {
    const index = supplemental.findIndex((row) => padId(row.id) === id);
    if (index >= 0) supplemental.splice(index, 1);
  }

  supplemental.push(featureRow);
  overrideIds.add(id);
  console.log(`Override ${id} (${featureRow.properties.name}) — ${reason}`);
}

// --- Kosovo (no numeric id in world-atlas) ---
const kosovo50 = findByName(f50, "Kosovo") ?? findByName(f110, "Kosovo");
if (kosovo50) {
  const kosovoId = countriesLib.alpha2ToNumeric("XK");
  addOverride(toFeature(kosovo50, kosovoId, "Kosovo"), "name-only territory");
}

// --- Serbia without Kosovo ---
const serbia50 = findByCode(f50, "RS");
if (serbia50 && kosovo50) {
  const clipped = subtractGeometry(serbia50.geometry, kosovo50.geometry);
  if (clipped) {
    addOverride(
      {
        type: "Feature",
        id: serbia50.id,
        properties: { name: "Serbia" },
        geometry: clipped,
      },
      "Serbia minus Kosovo"
    );
  }
}

// --- Other Balkan countries: 50m detail ---
for (const code of BALKAN_HIGH_RES_CODES) {
  if (code === "RS" || code === "XK") continue;

  const source = findByCode(f50, code);
  if (!source) {
    console.warn(`Missing 50m source for ${code}`);
    continue;
  }

  addOverride(toFeature(source, source.id), "Balkan high-res");
}

// Kosovo must paint above Serbia.
supplemental.sort((a, b) => {
  const aCode = codeForFeature(a);
  const bCode = codeForFeature(b);
  if (aCode === "XK") return 1;
  if (bCode === "XK") return -1;
  if (aCode === "RS") return bCode === "XK" ? -1 : 1;
  if (bCode === "RS") return aCode === "XK" ? 1 : -1;
  return padId(a.id).localeCompare(padId(b.id));
});

// Sanity-check every override geometry.
for (const row of supplemental) {
  if (!overrideIds.has(padId(row.id)) && !BALKAN_HIGH_RES_CODES.has(codeForFeature(row))) {
    continue;
  }

  const code = codeForFeature(row);
  const area = featureArea(row.geometry);
  if (!Number.isFinite(area) || area <= 0 || area > 0.05) {
    throw new Error(`Invalid geometry for ${code ?? row.id}: area=${area}`);
  }
}

const outDir = path.join(root, "lib/data/map");
fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, "supplemental-countries.json");
fs.writeFileSync(
  outPath,
  `${JSON.stringify({ type: "FeatureCollection", features: supplemental })}\n`,
  "utf8"
);

console.log(
  `Wrote ${supplemental.length} supplemental countries to ${outPath} (${Math.round(fs.statSync(outPath).size / 1024)} KB)`
);
