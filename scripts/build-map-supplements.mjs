import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";
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

const f110 = feature(countries110, countries110.objects.countries).features;
const f50 = feature(countries50, countries50.objects.countries).features;
const ids110 = new Set(f110.map((row) => String(row.id).padStart(3, "0")));

const supplemental = f50
  .filter((row) => {
    const code = countriesLib.numericToAlpha2(String(row.id).padStart(3, "0"));
    if (!code || !WANTED_CODES.has(code)) return false;
    return !ids110.has(String(row.id).padStart(3, "0"));
  })
  .map((row) => ({
    type: "Feature",
    id: row.id,
    properties: row.properties,
    geometry: row.geometry,
  }));

/** world-atlas omits numeric ids for some territories (Kosovo uses XK / 983). */
const NAME_ONLY_SUPPLEMENTS = [{ name: "Kosovo", code: "XK" }];
for (const entry of NAME_ONLY_SUPPLEMENTS) {
  const numericId = countriesLib.alpha2ToNumeric(entry.code);
  if (!numericId) continue;

  const id = String(numericId).padStart(3, "0");
  if (ids110.has(id) || supplemental.some((row) => String(row.id).padStart(3, "0") === id)) {
    continue;
  }

  const source =
    f50.find((row) => row.properties?.name === entry.name) ??
    f110.find((row) => row.properties?.name === entry.name);
  if (!source) continue;

  supplemental.push({
    type: "Feature",
    id: numericId,
    properties: { name: entry.name },
    geometry: source.geometry,
  });
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
