import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import countriesLib from "i18n-iso-countries";

const require = createRequire(import.meta.url);
countriesLib.registerLocale(require("i18n-iso-countries/langs/en.json"));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const COUNTRY_ALIASES = {
  "United States": "US",
  "United States of America": "US",
  "Estados Unidos": "US",
  Brasil: "BR",
  Brazil: "BR",
  "United Kingdom": "GB",
  UK: "GB",
  Türkiye: "TR",
  Turkey: "TR",
  Italia: "IT",
  Italy: "IT",
  España: "ES",
  Spain: "ES",
  Deutschland: "DE",
  Germany: "DE",
  France: "FR",
  Francia: "FR",
  "South Korea": "KR",
  "Korea, South": "KR",
  "Republic of Korea": "KR",
  "Czech Republic": "CZ",
  Czechia: "CZ",
  Russia: "RU",
  "Russian Federation": "RU",
  Vietnam: "VN",
  "Viet Nam": "VN",
  UAE: "AE",
  "U.A.E.": "AE",
  "United Arab Emirates": "AE",
  Perú: "PE",
  Peru: "PE",
  Bélgica: "BE",
  Belgium: "BE",
  Egipto: "EG",
  Egypt: "EG",
  Irlanda: "IE",
  Ireland: "IE",
  "Vatican City": "VA",
  "Ciudad del Vaticano": "VA",
  "Hong Kong SAR": "HK",
  "Hong Kong": "HK",
  Laos: "LA",
  Nederland: "NL",
  Netherlands: "NL",
  Schweiz: "CH",
  Switzerland: "CH",
  Österreich: "AT",
  Austria: "AT",
  México: "MX",
  Mexico: "MX",
  Argentina: "AR",
  Chile: "CL",
  Colombia: "CO",
  Japan: "JP",
  China: "CN",
  Thailand: "TH",
  Indonesia: "ID",
  India: "IN",
  Morocco: "MA",
  Maroc: "MA",
  Itália: "IT",
  "Myanmar (Burma)": "MM",
  Myanmar: "MM",
  "Reino Unido": "GB",
  "África do Sul": "ZA",
  "South Africa": "ZA",
  Canadá: "CA",
  Canada: "CA",
  Croacia: "HR",
  Croatia: "HR",
  "Emirati Arabi Uniti": "AE",
  England: "GB",
  Grécia: "GR",
  Greece: "GR",
  "Güney Kore": "KR",
  Lituânia: "LT",
  Lithuania: "LT",
  Marruecos: "MA",
  "Países Bajos": "NL",
  Scotland: "GB",
  Vaticano: "VA",
};

const SUPPLEMENTS = `CountryCode,Name,Latitude,Longitude
NL,Giethoorn,52.7400,6.0792
IT,Amalfi Coast,40.6333,14.6000
IT,Positano,40.6281,14.4850
IT,Sorrento,40.6263,14.3758
IT,Cinque Terre,44.1461,9.6439
IT,Portofino,44.3038,9.2081
IT,San Gimignano,43.4674,11.0429
FR,Saint-Tropez,43.2693,6.6398
FR,Chamonix,45.9227,6.8685
TR,Cappadocia,38.6431,34.8289
TR,Pamukkale,37.9137,29.1187
TR,Bodrum,37.0344,27.4305
TR,Fethiye,36.6213,29.1164
TR,Antalya,36.8969,30.7133
TR,Göreme,38.6431,34.8289
TR,Izmir,38.4237,27.1428
TR,Bursa,40.1885,29.0610
TR,Marmaris,36.8550,28.2742
TR,Kuşadası,37.8575,27.2610
TR,Ephesus,37.9390,27.3410
TR,Alanya,36.5444,31.9954
TR,Çeşme,38.3228,26.3065
TR,Safranbolu,41.2508,32.6942
TR,Mardin,37.3122,40.7350
TR,Gaziantep,37.0662,37.3833
TR,Şanlıurfa,37.1591,38.7969
TR,Trabzon,41.0027,39.7168
TR,Rize,41.0255,40.5177
TR,Çanakkale,40.1553,26.4142
TR,Ankara,39.9334,32.8597
TR,Konya,37.8746,32.4932
TR,Kemer,36.5978,30.5604
TR,Side,36.7667,31.3889
GR,Santorini,36.3932,25.4615
GR,Mykonos,37.4467,25.3289
GR,Meteora,39.7217,21.6306
PT,Algarve,37.0179,-7.9308
PT,Sintra,38.8029,-9.3817
PT,Porto,41.1579,-8.6291
HR,Dubrovnik,42.6507,18.0944
HR,Split,43.5081,16.4402
HR,Hvar,43.1729,16.4416
HR,Plitvice Lakes,44.8654,15.5820
CH,Zermatt,46.0207,7.7491
CH,Interlaken,46.6863,7.8632
CH,Lucerne,47.0502,8.3093
CH,Lausanne,46.5197,6.6323
CH,Geneva,46.2044,6.1432
CH,Chur,46.8499,9.5329
AT,Salzburg,47.8095,13.0550
AT,Innsbruck,47.2692,11.4041
AT,Hallstatt,47.5622,13.6493
EG,Luxor,25.6872,32.6396
EG,Aswan,24.0889,32.8998
EG,Sharm El Sheikh,27.9158,34.3300
MA,Marrakech,31.6295,-7.9811
MA,Fes,34.0181,-5.0078
MA,Chefchaouen,35.1688,-5.2636
MA,Sahara Desert,31.0994,-4.0127
ZA,Kruger National Park,-24.0078,31.4854
ZA,Cape Winelands,-33.9249,18.4241
KE,Maasai Mara,-1.4900,35.1439
TZ,Zanzibar,-6.1659,39.2026
TZ,Serengeti,-2.3333,34.8333
TH,Chiang Mai,18.7883,98.9853
TH,Krabi,8.0863,98.9063
TH,Phuket,7.8804,98.3923
TH,Koh Samui,9.5120,100.0136
TH,Ayutthaya,14.3532,100.5689
VN,Ha Long Bay,20.9101,107.1839
VN,Hoi An,15.8801,108.3380
VN,Sapa,22.3364,103.8440
VN,Da Nang,16.0544,108.2022
IN,Jaipur,26.9124,75.7873
IN,Agra,27.1767,78.0081
IN,Goa,15.2993,74.1240
IN,Varanasi,25.3176,82.9739
IN,Udaipur,24.5854,73.7125
JP,Kyoto,35.0116,135.7681
JP,Osaka,34.6937,135.5023
JP,Nara,34.6851,135.8048
JP,Hiroshima,34.3853,132.4553
JP,Hakone,35.2324,139.1069
KR,Jeju Island,33.4996,126.5312
KR,Busan,35.1796,129.0756
KR,Gyeongju,35.8562,129.2247
ID,Bali,-8.3405,115.0920
ID,Yogyakarta,-7.7956,110.3695
ID,Lombok,-8.5650,116.3512
AU,Great Barrier Reef,-18.2871,147.6992
AU,Gold Coast,-28.0167,153.4000
AU,Uluru,-25.3444,131.0369
AU,Blue Mountains,-33.7121,150.3119
NZ,Queenstown,-45.0312,168.6626
NZ,Rotorua,-38.1368,176.2497
NZ,Milford Sound,-44.6414,167.8974
US,Grand Canyon,36.0544,-112.1401
US,Yellowstone,44.4280,-110.5885
US,Las Vegas,36.1699,-115.1398
US,San Francisco,37.7749,-122.4194
US,Miami,25.7617,-80.1918
US,New Orleans,29.9511,-90.0715
US,Honolulu,21.3069,-157.8583
US,Sedona,34.8697,-111.7610
CA,Banff,51.1784,-115.5708
CA,Niagara Falls,43.0896,-79.0849
CA,Quebec City,46.8139,-71.2080
CA,Vancouver,49.2827,-123.1207
MX,Cancun,21.1619,-86.8515
MX,Tulum,20.2114,-87.4654
MX,Oaxaca,17.0732,-96.7266
MX,Cabo San Lucas,22.8905,-109.9167
BR,Rio de Janeiro,-22.9068,-43.1729
BR,Salvador,-12.9777,-38.5016
BR,Florianopolis,-27.5954,-48.5480
BR,Amazon Rainforest,-3.4653,-62.2159
AR,Patagonia,-41.1335,-71.3103
AR,Mendoza,-32.8895,-68.8458
AR,Bariloche,-41.1335,-71.3103
CL,Torres del Paine,-50.9423,-73.4068
CL,San Pedro de Atacama,-22.9098,-68.1993
CL,Easter Island,-27.1127,-109.3497
CO,Cartagena,10.3910,-75.4794
CO,Medellin,6.2476,-75.5658
CO,Coffee Region,4.8137,-75.6946
BE,Gent,51.0543,3.7174
BE,Brugge,51.2093,3.2247
BE,Balen,51.1689,5.1706
BE,Liege,50.6326,5.5797
DK,Kolding,55.4904,9.4721
NL,Breda,51.5719,4.7683
NL,Hoofddorp,52.3041,4.6889
NL,Haarlem,52.3874,4.6462
NL,Alkmaar,52.6324,4.7534
NL,Tilburg,51.5656,5.0913
LI,Liechtenstein,47.1660,9.5554
LU,Luxembourg,49.6116,6.1319
`;

function countryToCode(countryName) {
  if (COUNTRY_ALIASES[countryName]) return COUNTRY_ALIASES[countryName];
  return countriesLib.getAlpha2Code(countryName, "en") ?? null;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const stripQuotes = (value) => {
    const v = value.trim();
    if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
    return v;
  };
  const header = lines[0].split(",").map(stripQuotes);
  return lines.slice(1).map((line) => {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) {
        values.push(stripQuotes(current));
        current = "";
        continue;
      }
      current += char;
    }
    values.push(stripQuotes(current));
    return Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]));
  });
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

/** Local spellings → preferred English display name (app is English-first). */
const CITY_NAME_ALIASES = {
  köln: "Cologne",
  cologne: "Cologne",
  københavn: "Copenhagen",
  copenhagen: "Copenhagen",
  münchen: "Munich",
  munich: "Munich",
  wien: "Vienna",
  vienna: "Vienna",
  roma: "Rome",
  milano: "Milan",
  firenze: "Florence",
  napoli: "Naples",
  torino: "Turin",
  genova: "Genoa",
  lisboa: "Lisbon",
  praha: "Prague",
  kraków: "Krakow",
  krakow: "Krakow",
  zürich: "Zurich",
  zurich: "Zurich",
  genève: "Geneva",
  geneva: "Geneva",
  bruxelles: "Brussels",
  brussel: "Brussels",
  antwerpen: "Antwerp",
  göteborg: "Gothenburg",
  moskva: "Moscow",
  "saint petersburg": "Saint Petersburg",
  "st petersburg": "Saint Petersburg",
  "st. petersburg": "Saint Petersburg",
  beograd: "Belgrade",
  bucurești: "Bucharest",
  bucharest: "Bucharest",
  wrocław: "Wroclaw",
  poznań: "Poznan",
  gdańsk: "Gdansk",
  łódź: "Lodz",
  lodz: "Lodz",
  athens: "Athens",
  athína: "Athens",
  peiraias: "Athens",
  piraeus: "Athens",
};

/** Country-specific spellings and tourist-area aliases (English display names). */
const COUNTRY_CITY_ALIASES = {
  IT: {
    florencia: "Florence",
    florance: "Florence",
    firenze: "Florence",
    milão: "Milan",
    milao: "Milan",
    milano: "Milan",
    nápoles: "Naples",
    napoles: "Naples",
    napoli: "Naples",
    venecia: "Venice",
    venezia: "Venice",
    roma: "Rome",
    torino: "Turin",
    genova: "Genoa",
    "lake como": "Como",
    "como lake": "Como",
    amalfi: "Amalfi Coast",
    lombardy: "Como",
  },
};

const IT_REGION_NAMES = new Set([
  "Lombardy",
  "Veneto",
  "Aosta Valley",
  "Tuscany",
  "Sicily",
  "Sardinia",
  "Lazio",
  "Campania",
  "Piedmont",
  "Liguria",
]);

/** Airport suburbs / metro stations → the city travellers mean. */
const AIRPORT_AREA_TO_CITY = {
  "FR:Marignane": "Marseille",
  "FR:Blagnac": "Toulouse",
  "FR:Lesquin": "Lille",
  "FR:Colombier-Saugnieu": "Lyon",
  "FR:Entzheim": "Strasbourg",
  "FR:Roissy-en-France": "Paris",
  "FR:Tremblay-en-France": "Paris",
  "FR:Mauregard": "Paris",
  "FR:Orly": "Paris",
  "FR:Le Mesnil-Amelot": "Paris",
  "FR:Rivesaltes": "Perpignan",
  "FR:Garons": "Nimes",
  "FR:Biard": "Poitiers",
  "FR:Marcillac": "Rodez",
  "FR:Montoir": "Saint-Nazaire",
  "FR:Octeville": "Le Havre",
  "FR:Saint-Jacques-de-la-Lande": "Rennes",
  "DE:Schönefeld": "Berlin",
  "DE:Flughafen": "Berlin",
  "DE:Norderstedt": "Hamburg",
  "DE:Fuhlsbüttel": "Hamburg",
  "GB:Hounslow": "London",
  "GB:Hillingdon": "London",
  "GB:Hayes": "London",
  "IT:Fiumicino": "Rome",
  "IT:Ciampino": "Rome",
  "IT:Peschiera Borromeo": "Milan",
  "IT:Ferno": "Milan",
  "IT:Garbatella": "Rome",
  "IT:Municipio Ostia Antica": "Rome",
  "IT:Caselle Torinese": "Turin",
  "IT:Orio al Serio": "Milan",
  "IT:Segrate": "Milan",
  "ES:El Prat de Llobregat": "Barcelona",
  "ES:Barajas": "Madrid",
  "NL:Haarlemmermeer": "Amsterdam",
  "BE:Zaventem": "Brussels",
  "CH:Kloten": "Zurich",
  "AT:Schwechat": "Vienna",
  "TR:Arnavutköy": "Istanbul",
  "TR:Pendik": "Istanbul",
};

function parseMunicipalityBase(raw) {
  let name = normalizeName(raw);
  if (!name) return "";

  const paren = name.indexOf("(");
  if (paren > 0) name = name.slice(0, paren).trim();

  const slash = name.indexOf("/");
  if (slash > 0) name = name.slice(0, slash).trim();

  const comma = name.indexOf(",");
  if (comma > 0) {
    const after = name.slice(comma + 1).trim();
    if (!/^[A-Z]{2}$/.test(after) && !/D\.C\./i.test(after)) {
      name = name.slice(0, comma).trim();
    }
  }

  return name;
}

function parseAirportNameToCity(raw) {
  let name = normalizeName(raw);
  if (!name) return "";

  name = name.replace(/\s+Airport.*$/i, "");
  name = name.replace(/\s+International.*$/i, "");
  name = name.replace(/\s+Intl\.?.*$/i, "");

  const hyphen = name.indexOf("-");
  if (hyphen > 0) {
    const prefix = name.slice(0, hyphen).trim();
    if (prefix.length >= 3 && prefix.length <= 24) name = prefix;
  }

  return name;
}

function canonicalCityName(countryCode, rawName) {
  const code = countryCode.toUpperCase();
  let name = parseMunicipalityBase(rawName);
  if (!name) return "";

  const areaKey = `${code}:${name}`;
  if (AIRPORT_AREA_TO_CITY[areaKey]) {
    name = AIRPORT_AREA_TO_CITY[areaKey];
  }

  const countryAlias = COUNTRY_CITY_ALIASES[code]?.[name.toLocaleLowerCase("en")];
  if (countryAlias) {
    name = countryAlias;
  } else {
    const alias = CITY_NAME_ALIASES[name.toLocaleLowerCase("en")];
    if (alias) name = alias;
  }

  if (/airport|aéroport|aeroport|flughafen|airfield|air base/i.test(name)) {
    return "";
  }
  if (name.length < 2 || name.length > 40) return "";

  return name;
}

function cityNameFromAirport(row) {
  const code = (row.iso_country ?? "").trim().toUpperCase();
  if (!code) return "";

  let name = canonicalCityName(code, row.municipality ?? "");
  if (!name) {
    name = canonicalCityName(code, parseAirportNameToCity(row.name ?? ""));
  }

  return name;
}

function rowKey(code, name) {
  const canonical = canonicalCityName(code, name);
  return `${code.toUpperCase()}:${foldAsciiKey(canonical)}`;
}

function loadCityExclusions() {
  const exclusionPath = path.join(root, "lib/data/sources/city-exclusions.csv");
  if (!fs.existsSync(exclusionPath)) return new Set();

  const exclusions = new Set();
  const lines = fs.readFileSync(exclusionPath, "utf8").trim().split("\n").slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;
    const [countryCode, name] = line.split(",").map((part) => part.trim());
    if (!countryCode || !name) continue;
    exclusions.add(rowKey(countryCode, name));
  }

  return exclusions;
}

let cityExclusionsCache = null;

function getCityExclusions() {
  if (!cityExclusionsCache) {
    cityExclusionsCache = loadCityExclusions();
  }
  return cityExclusionsCache;
}

/** US state names stored as "cities" in source data — not pickable destinations. */
const US_STATE_NAMES = new Set([
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina",
  "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
  "Washington", "West Virginia", "Wisconsin", "Wyoming",
]);

const CITY_NAMES_KEEP_SUFFIX = new Set([
  "panama city",
  "mexico city",
  "guatemala city",
  "oklahoma city",
  "kansas city",
  "jersey city",
  "salt lake city",
  "carson city",
  "jefferson city",
  "new york city",
  "quebec city",
  "ho chi minh city",
]);

/** Fold Turkish / Latin diacritics so Goreme ≈ Göreme. */
function foldAsciiKey(value) {
  return String(value)
    .trim()
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("İ", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function normalizeForDedupe(countryCode, name) {
  let n = normalizeName(name);
  n = n.replace(/^Condado de /i, "");
  n = n.replace(/^State of /i, "");
  n = n.replace(/ County$/i, "");
  n = n.replace(/ City Council$/i, "");
  n = n.replace(/ Municipality$/i, "");
  n = n.replace(/ Municipio$/i, "");
  n = n.replace(/ Regency$/i, "");
  n = n.replace(/ Island$/i, "");
  n = n.replace(/ Division$/i, "");
  n = n.replace(/ \d+$/u, "");

  if (!CITY_NAMES_KEEP_SUFFIX.has(n.toLocaleLowerCase("en")) && / City$/i.test(n)) {
    n = n.replace(/ City$/i, "");
  }

  if (countryCode === "CA" && n === "Quebec") {
    n = "Quebec City";
  }

  const countryAlias = COUNTRY_CITY_ALIASES[countryCode]?.[n.toLocaleLowerCase("en")];
  if (countryAlias) {
    n = countryAlias;
  }

  return n;
}

function isLowQualityPlaceName(countryCode, name) {
  const n = normalizeName(name);
  if (/ County$/i.test(n)) return true;
  if (/ Region$/i.test(n)) return true;
  if (/ Province$/i.test(n)) return true;
  if (/^Condado de /i.test(n)) return true;
  if (/^State of /i.test(n)) return true;
  if (/ City Council$/i.test(n)) return true;
  if (/ Division$/i.test(n)) return true;
  if (/ Regency$/i.test(n)) return true;
  if (countryCode === "US" && US_STATE_NAMES.has(n)) return true;
  if (countryCode === "IT" && IT_REGION_NAMES.has(n)) return true;
  if (countryCode === "IT" && / Valley$/i.test(n)) return true;
  return false;
}

function dedupeKey(countryCode, name) {
  return `${countryCode}:${foldAsciiKey(normalizeForDedupe(countryCode, name))}`;
}

function diacriticScore(name) {
  return [...String(name)].filter((ch) => {
    const base = ch.normalize("NFD").replace(/\p{M}/gu, "");
    return base !== ch || /[ışğüöçİŞĞÜÖÇ]/u.test(ch);
  }).length;
}

function isBareProvinceDuplicate(name, group) {
  const lower = name.toLocaleLowerCase("en");
  return group.some((other) => {
    if (other.name === name) return false;
    return other.name.toLocaleLowerCase("en") === `${lower} city`;
  });
}

function pickPreferredPlace(candidates) {
  return [...candidates].sort((a, b) => {
    const aLow = isLowQualityPlaceName(a.countryCode, a.name);
    const bLow = isLowQualityPlaceName(b.countryCode, b.name);
    if (aLow !== bLow) return aLow ? 1 : -1;

    const aBare = isBareProvinceDuplicate(a.name, candidates);
    const bBare = isBareProvinceDuplicate(b.name, candidates);
    if (aBare !== bBare) return aBare ? 1 : -1;

    const aDia = diacriticScore(a.name);
    const bDia = diacriticScore(b.name);
    if (aDia !== bDia) return bDia - aDia;

    if (b.reelCount !== a.reelCount) return b.reelCount - a.reelCount;
    if (a.name.length !== b.name.length) return a.name.length - b.name.length;
    return a.name.localeCompare(b.name, "tr");
  })[0];
}

function shouldDropStandalone(entry) {
  const n = normalizeName(entry.name);
  if (entry.countryCode === "US" && US_STATE_NAMES.has(n)) {
    if (n === "New York" || n === "Washington") return false;
    return true;
  }
  if (entry.countryCode === "IT" && IT_REGION_NAMES.has(n)) return true;
  if (/ County$/i.test(n)) return true;
  if (/^Condado de /i.test(n)) return true;
  return false;
}

function dedupeNearDuplicatePlaces(entries) {
  const groups = new Map();

  for (const entry of entries) {
    const key = dedupeKey(entry.countryCode, entry.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  return [...groups.values()]
    .map((group) => pickPreferredPlace(group))
    .filter((entry) => !shouldDropStandalone(entry));
}

const AIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const AIRPORT_TYPES = new Set(["large_airport", "medium_airport"]);

function putCity(merged, entry, overwrite = false) {
  const name = canonicalCityName(entry.countryCode, entry.name);
  if (!name) return;

  const normalized = {
    ...entry,
    countryCode: entry.countryCode.toUpperCase(),
    name,
    latitude: Number(entry.latitude.toFixed(4)),
    longitude: Number(entry.longitude.toFixed(4)),
  };

  const key = rowKey(normalized.countryCode, normalized.name);
  if (getCityExclusions().has(key)) return;
  if (!overwrite && merged.has(key)) return;
  merged.set(key, normalized);
}

function loadCodeNameRows(rows) {
  const cities = [];
  for (const row of rows) {
    const code = row.CountryCode?.trim().toUpperCase();
    const name = canonicalCityName(code, row.Name ?? "");
    const latitude = Number.parseFloat(row.Latitude);
    const longitude = Number.parseFloat(row.Longitude);
    if (!code || !name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    cities.push({
      countryCode: code,
      name,
      latitude: Number(latitude.toFixed(4)),
      longitude: Number(longitude.toFixed(4)),
      reelCount: 0,
    });
  }
  return cities;
}

async function ensureAirportsCsv(airportsPath) {
  if (fs.existsSync(airportsPath)) return;
  console.log("Downloading OurAirports data…");
  const response = await fetch(AIRPORTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to download airports.csv (${response.status})`);
  }
  fs.writeFileSync(airportsPath, await response.text(), "utf8");
}

function loadAirportCities(airportsPath) {
  if (!fs.existsSync(airportsPath)) return [];

  const rows = parseCsv(fs.readFileSync(airportsPath, "utf8"));
  const byCity = new Map();

  for (const row of rows) {
    if (row.scheduled_service !== "yes") continue;
    if (!AIRPORT_TYPES.has(row.type)) continue;

    const iata = (row.iata_code ?? "").trim();
    if (!iata || iata.length !== 3) continue;

    const code = (row.iso_country ?? "").trim().toUpperCase();
    if (!code || code.length !== 2) continue;

    const name = cityNameFromAirport(row);
    if (!name) continue;

    const latitude = Number.parseFloat(row.latitude_deg);
    const longitude = Number.parseFloat(row.longitude_deg);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const priority =
      row.type === "large_airport" ? 3 : row.type === "medium_airport" ? 2 : 1;
    const key = rowKey(code, name);
    const existing = byCity.get(key);

    if (!existing || priority > existing.priority) {
      byCity.set(key, {
        countryCode: code,
        name,
        latitude: Number(latitude.toFixed(4)),
        longitude: Number(longitude.toFixed(4)),
        reelCount: 0,
        priority,
      });
    }
  }

  return [...byCity.values()].map(({ priority: _priority, ...city }) => city);
}

function loadCitiesFromCsv(csvPath) {
  const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n").slice(1);
  const cities = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^([^,]+),(.+),([^,]+),([^,]+)$/);
    if (!match) continue;
    const [, countryCode, name, latitude, longitude] = match;
    const code = countryCode.toUpperCase();
    const canonical = canonicalCityName(code, name);
    if (!canonical) continue;
    cities.push({
      countryCode: code,
      name: canonical,
      latitude: Number.parseFloat(latitude),
      longitude: Number.parseFloat(longitude),
      reelCount: 0,
    });
  }

  return cities;
}

function loadMajorCities(majorCitiesPath) {
  const raw = JSON.parse(fs.readFileSync(majorCitiesPath, "utf8"));
  const merged = new Map();

  for (const [countryCode, rows] of Object.entries(raw)) {
    if (!Array.isArray(rows)) continue;

    for (const row of rows) {
      const name = canonicalCityName(countryCode, row.name ?? "");
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

      putCity(merged, {
        countryCode,
        name,
        latitude: Number(latitude.toFixed(4)),
        longitude: Number(longitude.toFixed(4)),
        reelCount: 0,
      });
    }
  }

  return [...merged.values()];
}

function writeCityOutputs(output) {
  const csvLines = [
    "CountryCode,Name,Latitude,Longitude",
    ...output.map(
      (row) => `${row.countryCode},${row.name},${row.latitude},${row.longitude}`
    ),
  ];

  const csvPath = path.join(root, "lib/data/tourist-cities.csv");
  fs.writeFileSync(csvPath, `${csvLines.join("\n")}\n`, "utf8");

  const tsPath = path.join(root, "lib/data/tourist-cities.ts");
  const tsContent = `// Auto-generated by scripts/build-tourist-cities.mjs — do not edit by hand.
// Source: lib/data/major-cities.json (100k+ population city list).
// Exclusions: lib/data/sources/city-exclusions.csv

import { matchesPlaceNameSearch } from "@/lib/utils/place-search";
import { buildCitySlug } from "@/lib/utils/city-slug";

export type TouristCity = {
  countryCode: string;
  name: string;
  latitude: number;
  longitude: number;
};

export const TOURIST_CITIES: TouristCity[] = ${JSON.stringify(
    output.map(({ countryCode, name, latitude, longitude }) => ({
      countryCode,
      name,
      latitude,
      longitude,
    })),
    null,
    2
  )};

function compareCityNames(a: string, b: string): number {
  return a.localeCompare(b, "tr", { sensitivity: "base" });
}

/** Fold Turkish / Latin diacritics for identity checks (Goreme ≈ Göreme). */
function foldCityKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("İ", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .normalize("NFD")
    .replace(/\\p{M}/gu, "");
}

export function getTouristCitiesByCountry(countryCode: string): TouristCity[] {
  const code = countryCode.toUpperCase();
  return TOURIST_CITIES.filter((city) => city.countryCode === code).sort((a, b) =>
    compareCityNames(a.name, b.name)
  );
}

export function findTouristCitiesByExactName(
  cityName: string,
  countryCode?: string | null
): TouristCity[] {
  const needle = foldCityKey(cityName);
  if (!needle) return [];

  const pool = countryCode
    ? TOURIST_CITIES.filter((city) => city.countryCode === countryCode.toUpperCase())
    : TOURIST_CITIES;

  return pool.filter((city) => foldCityKey(city.name) === needle);
}

export function searchTouristCities(
  countryCode: string,
  query = "",
  limit = 80
): TouristCity[] {
  const code = countryCode.toUpperCase();
  const q = query.trim().toLocaleLowerCase("tr");

  let results = TOURIST_CITIES.filter((city) => city.countryCode === code);

  if (q.length >= 2) {
    results = results.filter((city) => matchesPlaceNameSearch(city.name, q));
  }

  return results.sort((a, b) => compareCityNames(a.name, b.name)).slice(0, limit);
}

export function searchTouristCitiesInCountries(
  countryCodes: string[],
  query: string,
  limit = 80
): TouristCity[] {
  const allowed = new Set(countryCodes.map((code) => code.toUpperCase()));
  const q = query.trim().toLocaleLowerCase("tr");
  if (q.length < 2 || allowed.size === 0) {
    return [];
  }

  const results = TOURIST_CITIES.filter(
    (city) => allowed.has(city.countryCode) && matchesPlaceNameSearch(city.name, q)
  );

  return results.sort((a, b) => compareCityNames(a.name, b.name)).slice(0, limit);
}

export function findTouristCitiesBySlug(slug: string): TouristCity[] {
  const target = slug.trim().toLowerCase();
  if (!target) return [];

  return TOURIST_CITIES.filter((city) => buildCitySlug(city.name) === target);
}
`;
  fs.writeFileSync(tsPath, tsContent, "utf8");

  const countries = new Set(output.map((row) => row.countryCode));
  console.log(`Wrote ${output.length} places across ${countries.size} countries to ${csvPath}`);
}

async function main() {
if (process.argv.includes("--from-csv")) {
  const csvPath = path.join(root, "lib/data/tourist-cities.csv");
  const exclusions = getCityExclusions();
  const before = loadCitiesFromCsv(csvPath);
  const filtered = before.filter(
    (city) => !exclusions.has(rowKey(city.countryCode, city.name))
  );
  const output = dedupeNearDuplicatePlaces(
    filtered.map((city) => ({ ...city, reelCount: city.reelCount ?? 0 }))
  ).sort((a, b) => {
    if (a.countryCode !== b.countryCode) return a.countryCode.localeCompare(b.countryCode);
    return a.name.localeCompare(b.name, "tr");
  });
  console.log(`Removed ${before.length - filtered.length} excluded cities`);
  console.log(`Collapsed ${filtered.length - output.length} diacritic/alias duplicates`);
  writeCityOutputs(output);
  return;
}
const majorCitiesPath = path.join(root, "lib/data/major-cities.json");
const exclusions = getCityExclusions();
const before = loadMajorCities(majorCitiesPath);
const filtered = before.filter((city) => !exclusions.has(rowKey(city.countryCode, city.name)));
const output = dedupeNearDuplicatePlaces(filtered).sort((a, b) => {
  if (a.countryCode !== b.countryCode) return a.countryCode.localeCompare(b.countryCode);
  return a.name.localeCompare(b.name, "tr");
});

writeCityOutputs(output);
console.log(`Loaded ${before.length} major cities from ${majorCitiesPath}`);
console.log(`Removed ${before.length - filtered.length} excluded cities`);
console.log(`Collapsed ${filtered.length - output.length} alias/diacritic duplicates`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
