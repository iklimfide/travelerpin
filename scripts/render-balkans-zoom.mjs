import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countries110 from "world-atlas/countries-110m.json" with { type: "json" };
import supplemental from "../lib/data/map/supplemental-countries.json" with { type: "json" };

const require = createRequire(import.meta.url);
const i18n = require("i18n-iso-countries");

function build() {
  const overrideIds = new Set(supplemental.features.map((f) => String(f.id).padStart(3, "0")));
  const base = feature(countries110, countries110.objects.countries).features
    .filter((f) => f.id && !overrideIds.has(String(f.id).padStart(3, "0")));
  return [...base, ...supplemental.features.filter((f) => f.id)];
}

const codes = ["AL", "BA", "BG", "HR", "XK", "GR", "ME", "MK", "RO", "RS", "SI", "HU", "AT"];
const colors = { RS: "#2563eb", XK: "#f59e0b", HR: "#10b981", BA: "#8b5cf6", GR: "#2563eb", TR: "#2563eb" };
const features = build().filter((f) => codes.includes(i18n.numericToAlpha2(String(f.id).padStart(3, "0"))));
const coll = { type: "FeatureCollection", features };
const proj = geoNaturalEarth1().fitExtent([[20, 20], [780, 430]], coll);
const path = geoPath(proj);
const paths = features
  .map((f) => {
    const code = i18n.numericToAlpha2(String(f.id).padStart(3, "0"));
    const d = path(f);
    if (!d) return "";
    const fill = colors[code] ?? "#cbd5e1";
    return `<path d="${d}" fill="${fill}" stroke="#fff" stroke-width="1"/>`;
  })
  .join("\n");

writeFileSync(
  "tmp-balkans-zoom.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><rect width="800" height="450" fill="#e8f1fb"/>${paths}</svg>`
);
console.log("wrote tmp-balkans-zoom.svg");
