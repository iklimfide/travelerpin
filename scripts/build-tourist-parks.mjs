import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const countriesLib = require("i18n-iso-countries");
countriesLib.registerLocale(require("i18n-iso-countries/langs/en.json"));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "TravelerPin/1.0 (https://travelerpin.com; build-tourist-parks)";

const QUERIES = {
  national_park: `
SELECT ?parkLabel ?coord ?countryCode WHERE {
  ?park wdt:P31/wdt:P279* wd:Q46169.
  ?park wdt:P625 ?coord.
  ?park wdt:P17 ?country.
  ?country wdt:P297 ?countryCode.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tr,de,fr,es,it,mul". }
}`,
  theme_park: `
SELECT ?parkLabel ?coord ?countryCode WHERE {
  ?park wdt:P31/wdt:P279* wd:Q194195.
  ?park wdt:P625 ?coord.
  ?park wdt:P17 ?country.
  ?country wdt:P297 ?countryCode.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tr,de,fr,es,it,mul". }
}`,
  botanical_garden: `
SELECT ?parkLabel ?coord ?countryCode WHERE {
  ?park wdt:P31/wdt:P279* wd:Q167346.
  ?park wdt:P625 ?coord.
  ?park wdt:P17 ?country.
  ?country wdt:P297 ?countryCode.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tr,de,fr,es,it,mul". }
}`,
};

function parsePoint(wkt) {
  const match = /Point\(([-\d.]+)\s+([-\d.]+)\)/.exec(wkt);
  if (!match) return null;
  const longitude = Number.parseFloat(match[1]);
  const latitude = Number.parseFloat(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/** Wikidata falls back to the entity id when no human label exists. */
function isWikidataIdLabel(name) {
  return /^Q\d+$/i.test(String(name ?? "").trim());
}

function stripQuotes(name) {
  // Only strip quotation marks — keep apostrophes (dell'Università, King's…).
  return name
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036«»]/g, "")
    .replace(/"/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Shorten catalog park names: drop type labels and quotes so lists stay scannable
 * and slugs stay clean (e.g. Giardino Botanico Alpino "rezia" → Rezia).
 */
function cleanName(name, parkType) {
  const original = stripQuotes(String(name ?? ""));
  if (!original) return original;

  let cleaned = original;

  // Longest phrases first.
  const sharedSuffixes = [
    /\s+National Park$/i,
    /\s+Theme Park$/i,
    /\s+Amusement Park$/i,
    /\s+Adventure Park$/i,
    /\s+Parco Nazionale$/i,
    /\s+Parc National$/i,
    /\s+Parque Nacional$/i,
    /\s+Nationalpark$/i,
  ];

  const botanicalPrefixes = [
    /^Giardino\s+Botanico\s+Alpino(?:\s+|[,:\-–—]\s*)/i,
    /^Giardino\s+Botanico(?:\s+|[,:\-–—]\s*)/i,
    /^Orto\s+Botanico(?:\s+|[,:\-–—]\s*)/i,
    /^Horto\s+Botanico(?:\s+|[,:\-–—]\s*)/i,
    /^Jardin\s+Botanique\s+Tropical(?:\s+|[,:\-–—]\s*)/i,
    /^Jardin\s+Botanique(?:\s+|[,:\-–—]\s*)/i,
    /^Jard[ií]n\s+Bot[aá]nico(?:\s+|[,:\-–—]\s*)/i,
    /^Jardim\s+Bot[aâ]nico(?:\s+|[,:\-–—]\s*)/i,
    /^Botanischer\s+Garten(?:\s+|[,:\-–—]\s*)/i,
    /^Tropischer\s+Botanischer\s+Garten(?:\s+|[,:\-–—]\s*)/i,
    /^Alpin(?:e|o)?\s+Botanical\s+Gardens?\s+(?:of\s+)?/i,
    /^(?:The\s+)?Botanical\s+Gardens?\s+at\s+(?:the\s+)?/i,
    /^(?:The\s+)?Botanical\s+Gardens?(?:\s+(?:of\s+)|[,:\-–—]\s*|\s+)/i,
    /^(?:The\s+)?Botanic\s+Gardens?(?:\s+(?:of\s+)|[,:\-–—]\s*|\s+)/i,
  ];

  const botanicalSuffixes = [
    /\s+Tropical\s+Botanical\s+Gardens?$/i,
    /\s+Botanical\s+Gardens?$/i,
    /\s+Botanic\s+Gardens?$/i,
    /\s+Giardino\s+Botanico(?:\s+Alpino)?$/i,
    /\s+Orto\s+Botanico$/i,
    /\s+Jardin\s+Botanique(?:\s+Tropical)?$/i,
    /\s+Jard[ií]n\s+Bot[aá]nico$/i,
    /\s+Jardim\s+Bot[aâ]nico$/i,
    /\s+Botanischer\s+Garten$/i,
    /\s+Alpine\s+Botanical\s+Gardens?$/i,
  ];

  const nationalPrefixes = [
    /^Parco\s+Nazionale\s+(?:del(?:la|lo|l')?\s+)?/i,
    /^Parc\s+National\s+(?:du\s+|de\s+la\s+|de\s+l'|des\s+|de\s+)?/i,
    /^Parque\s+Nacional\s+(?:de\s+la\s+|del?\s+|de\s+)?/i,
    /^National\s+Park\s+(?:of\s+)?/i,
    /^Nationalpark\s+/i,
  ];

  for (const pattern of sharedSuffixes) {
    cleaned = cleaned.replace(pattern, "");
  }

  if (parkType === "botanical_garden") {
    for (const pattern of botanicalPrefixes) {
      cleaned = cleaned.replace(pattern, "");
    }
    for (const pattern of botanicalSuffixes) {
      cleaned = cleaned.replace(pattern, "");
    }
    // Mid-label type words: "Bergamo Botanical Garden Lorenzo Rota" → "Bergamo Lorenzo Rota"
    cleaned = cleaned
      .replace(/\s+Botanical\s+Gardens?\s+/gi, " ")
      .replace(/\s+Botanic\s+Gardens?\s+/gi, " ")
      .replace(/\s+Giardino\s+Botanico(?:\s+Alpino)?\s+/gi, " ")
      .replace(/\s+Orto\s+Botanico\s+/gi, " ")
      .replace(/\s+Jardin\s+Botanique\s+/gi, " ")
      .replace(/\s+Jard[ií]n\s+Bot[aá]nico\s+/gi, " ")
      .replace(/\s+Botanischer\s+Garten\s+/gi, " ");
  }

  if (parkType === "national_park") {
    for (const pattern of nationalPrefixes) {
      cleaned = cleaned.replace(pattern, "");
    }
  }

  // Longer Italian articles first. Use Unicode uppercase lookahead (not /i) so
  // "Dell'Università" / fused "DellUniversità" do not match only "del".
  const leadingNoise =
    /^(?:dell['’]?|della|delle|dello|dei|degli|di|del|alle|of|de|du|des|der|das|die|den|at|the)(?:\s+|(?=\p{Lu}))/u;
  while (leadingNoise.test(cleaned)) {
    cleaned = cleaned.replace(leadingNoise, "");
  }
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Keep original (sans quotes) if stripping emptied the label.
  if (!cleaned) return original;

  // Title-ish case for leading character after aggressive lowercase Wikidata labels.
  return cleaned.replace(/^(\S)/u, (char) => char.toLocaleUpperCase("en-US"));
}

async function fetchParks(parkType) {
  const response = await fetch(`${WIKIDATA_ENDPOINT}?format=json&query=${encodeURIComponent(QUERIES[parkType])}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/sparql-results+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikidata ${parkType} failed: ${response.status}`);
  }

  const data = await response.json();
  const rows = data.results?.bindings ?? [];
  const parks = [];

  for (const row of rows) {
    const name = row.parkLabel?.value;
    const coord = row.coord?.value;
    const countryCode = row.countryCode?.value?.toUpperCase();
    if (!name || !coord || !countryCode || countryCode.length !== 2) continue;

    const point = parsePoint(coord);
    if (!point) continue;
    if (isWikidataIdLabel(name)) continue;

    const countryName = countriesLib.getName(countryCode, "en") ?? countryCode;
    parks.push({
      parkType,
      countryCode,
      countryName,
      name: cleanName(name, parkType),
      latitude: point.latitude,
      longitude: point.longitude,
    });
  }

  return parks.filter((park) => park.name && !isWikidataIdLabel(park.name));
}

function dedupeParks(parks) {
  const seen = new Set();
  const out = [];

  for (const park of parks) {
    const key = `${park.countryCode}:${park.parkType}:${park.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(park);
  }

  return out.sort((a, b) => {
    const byCountry = a.countryName.localeCompare(b.countryName);
    if (byCountry !== 0) return byCountry;
    return a.name.localeCompare(b.name);
  });
}

function loadParkSupplements() {
  const supplementPath = path.join(root, "lib/data/sources/park-supplements.csv");
  if (!fs.existsSync(supplementPath)) return [];

  const lines = fs.readFileSync(supplementPath, "utf8").trim().split("\n").slice(1);
  const parks = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^([^,]+),([^,]+),([^,]+),(.+),([^,]+),([^,]+)$/);
    if (!match) continue;
    const [, parkType, countryCode, countryName, name, latitude, longitude] = match;
    parks.push({
      parkType,
      countryCode: countryCode.toUpperCase(),
      countryName,
      name: cleanName(name, parkType),
      latitude: Number.parseFloat(latitude),
      longitude: Number.parseFloat(longitude),
    });
  }

  return parks.filter(
    (park) =>
      park.name &&
      !isWikidataIdLabel(park.name) &&
      Number.isFinite(park.latitude) &&
      Number.isFinite(park.longitude)
  );
}

function loadParksFromCsv(csvPath) {
  const csv = fs.readFileSync(csvPath, "utf8").trim();
  return csv
    .split("\n")
    .slice(1)
    .map((line) => {
      const match = line.match(
        /^([^,]+),([^,]+),"((?:[^"]|"")*)","((?:[^"]|"")*)",([^,]+),([^,]+)$/
      );
      if (!match) return null;
      const [, parkType, countryCode, countryNameRaw, nameRaw, latitude, longitude] = match;
      const name = cleanName(nameRaw.replace(/""/g, '"'), parkType);
      if (!name || isWikidataIdLabel(name)) return null;
      return {
        parkType,
        countryCode,
        countryName: countryNameRaw.replace(/""/g, '"'),
        name,
        latitude: Number.parseFloat(latitude),
        longitude: Number.parseFloat(longitude),
      };
    })
    .filter(Boolean);
}

function writeParkOutputs(all) {
  const csvPath = path.join(root, "lib/data/tourist-parks.csv");
  const csvLines = [
    "parkType,countryCode,countryName,name,latitude,longitude",
    ...all.map(
      (p) =>
        `${p.parkType},${p.countryCode},"${p.countryName.replace(/"/g, '""')}","${p.name.replace(/"/g, '""')}",${p.latitude},${p.longitude}`
    ),
  ];
  fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");

  const tsPath = path.join(root, "lib/data/tourist-parks.ts");
  const tsContent = `// Auto-generated by scripts/build-tourist-parks.mjs — do not edit by hand.
// Source: Wikidata (national park Q46169, amusement park Q194195, botanical garden Q167346)
//         + lib/data/sources/park-supplements.csv

export type ParkType = "national_park" | "theme_park" | "botanical_garden";

export type TouristPark = {
  parkType: ParkType;
  countryCode: string;
  countryName: string;
  name: string;
  latitude: number;
  longitude: number;
};

export const TOURIST_PARKS: TouristPark[] = ${JSON.stringify(all, null, 2)};
`;
  fs.writeFileSync(tsPath, tsContent, "utf8");
  console.log(`Wrote ${csvPath} and ${tsPath}`);
}

const fromCsvOnly = process.argv.includes("--from-csv");

if (fromCsvOnly) {
  const csvPath = path.join(root, "lib/data/tourist-parks.csv");
  const all = dedupeParks([...loadParksFromCsv(csvPath), ...loadParkSupplements()]);
  console.log(`Merged supplements into CSV dataset: ${all.length} parks`);
  writeParkOutputs(all);
} else {
  const national = await fetchParks("national_park");
  console.log(`National parks: ${national.length}`);
  await new Promise((r) => setTimeout(r, 1200));
  const theme = await fetchParks("theme_park");
  console.log(`Theme parks: ${theme.length}`);
  await new Promise((r) => setTimeout(r, 1200));
  const botanical = await fetchParks("botanical_garden");
  console.log(`Botanical gardens: ${botanical.length}`);

  const all = dedupeParks([...national, ...theme, ...botanical, ...loadParkSupplements()]);
  console.log(`Total unique: ${all.length}`);
  writeParkOutputs(all);
}
