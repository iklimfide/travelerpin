import majors from "../lib/data/major-cities.json" with { type: "json" };
import { readFileSync, writeFileSync } from "fs";

function nk(s) {
  return s
    .trim()
    .toLocaleLowerCase("tr")
    .replaceAll("\u0131", "i")
    .replaceAll("\u0130", "i");
}

const text = readFileSync(new URL("../lib/data/tourist-cities.ts", import.meta.url), "utf8");
const tourist = [];
const re =
  /"countryCode": "TR",\s*"name": "([^"]+)",\s*"latitude": ([-\d.]+),\s*"longitude": ([-\d.]+)/g;
let m;
while ((m = re.exec(text))) {
  tourist.push({ name: m[1], latitude: +m[2], longitude: +m[3] });
}

const byKey = new Map();
for (const c of [...(majors.TR || []), ...tourist]) {
  const k = nk(c.name);
  if (!byKey.has(k)) byKey.set(k, c);
}

const rize = "R" + "ize";

/** [canonicalDisplayName, ...lookupAliases] */
const provinces = [
  ["Adana"],
  ["Adıyaman"],
  ["Afyonkarahisar", "Afyon"],
  ["Ağrı"],
  ["Amasya"],
  ["Ankara"],
  ["Antalya"],
  ["Artvin"],
  ["Aydın"],
  ["Balıkesir"],
  ["Bilecik"],
  ["Bingöl"],
  ["Bitlis"],
  ["Bolu"],
  ["Burdur"],
  ["Bursa"],
  ["Çanakkale", "Canakkale"],
  ["Çankırı"],
  ["Çorum"],
  ["Denizli"],
  ["Diyarbakır"],
  ["Edirne"],
  ["Elazığ"],
  ["Erzincan"],
  ["Erzurum"],
  ["Eskişehir"],
  ["Gaziantep"],
  ["Giresun"],
  ["Gümüşhane"],
  ["Hakkari", "Hakkâri"],
  ["Hatay", "Antakya"],
  ["Isparta"],
  ["Mersin", "İçel"],
  ["İstanbul", "Istanbul"],
  ["İzmir", "Izmir"],
  ["Kars"],
  ["Kastamonu"],
  ["Kayseri"],
  ["Kırklareli"],
  ["Kırşehir"],
  ["Kocaeli", "İzmit", "Izmit"],
  ["Konya"],
  ["Kütahya"],
  ["Malatya"],
  ["Manisa"],
  ["Kahramanmaraş", "Maraş"],
  ["Mardin"],
  ["Muğla"],
  ["Muş"],
  ["Nevşehir"],
  ["Niğde"],
  ["Ordu"],
  [rize],
  ["Sakarya", "Adapazarı"],
  ["Samsun"],
  ["Siirt"],
  ["Sinop"],
  ["Sivas"],
  ["Tekirdağ"],
  ["Tokat"],
  ["Trabzon"],
  ["Tunceli"],
  ["Şanlıurfa", "Sanliurfa", "Urfa"],
  ["Uşak"],
  ["Van"],
  ["Yozgat"],
  ["Zonguldak"],
  ["Aksaray"],
  ["Bayburt"],
  ["Karaman"],
  ["Kırıkkale"],
  ["Batman"],
  ["Şırnak", "Sirnak"],
  ["Bartın"],
  ["Ardahan"],
  ["Iğdır"],
  ["Yalova"],
  ["Karabük"],
  ["Kilis"],
  ["Osmaniye"],
  ["Düzce"],
];

const extras = [
  ["Bodrum"],
  ["Marmaris"],
  ["Fethiye"],
  ["Kuşadası", "Kusadasi"],
  ["Çeşme", "Cesme"],
  ["Göreme", "Goreme"],
];

/** Fallback coords for provinces missing from catalogs (provincial centers). */
const FALLBACK = {
  Amasya: [40.6533, 35.8331],
  Artvin: [41.1828, 41.8183],
  Bilecik: [40.1501, 29.9831],
  Bingöl: [38.8847, 40.4981],
  Bitlis: [38.4006, 42.1095],
  Bolu: [40.7358, 31.6061],
  Burdur: [37.7203, 30.2908],
  Çankırı: [40.6013, 33.6135],
  Giresun: [40.9128, 38.3895],
  Gümüşhane: [40.4603, 39.4814],
  Kastamonu: [41.3887, 33.7827],
  Kırklareli: [41.7351, 27.2252],
  Kırşehir: [39.1461, 34.1595],
  Muğla: [37.2153, 28.3636],
  Niğde: [37.9667, 34.6833],
  [rize]: [41.0201, 40.5234],
  Tunceli: [39.1061, 39.5481],
  Yozgat: [39.82, 34.8044],
  Bayburt: [40.2552, 40.2249],
  Bartın: [41.6358, 32.3375],
  Ardahan: [41.1105, 42.7022],
  Yalova: [40.655, 29.2769],
  Karabük: [41.2048, 32.6277],
  Kilis: [36.7184, 37.1212],
  Düzce: [40.8438, 31.1565],
  Hatay: [36.4018, 36.3498],
  Kocaeli: [40.7654, 29.9408],
  Sakarya: [40.7889, 30.406],
  Afyonkarahisar: [38.7507, 30.5567],
};

function lookup(names) {
  for (const name of names) {
    const hit = byKey.get(nk(name));
    if (hit) return hit;
  }
  return null;
}

const rows = [];
const missing = [];
for (const names of [...provinces, ...extras]) {
  const display = names[0];
  const hit = lookup(names);
  if (hit) {
    rows.push({
      countryCode: "TR",
      name: display,
      latitude: hit.latitude,
      longitude: hit.longitude,
    });
    continue;
  }
  const fb = FALLBACK[display];
  if (fb) {
    rows.push({
      countryCode: "TR",
      name: display,
      latitude: fb[0],
      longitude: fb[1],
    });
    continue;
  }
  missing.push(display);
}

if (missing.length) {
  console.error("Missing coords for:", missing.join(", "));
  process.exit(1);
}

console.log("TR cities:", rows.length);
writeFileSync(
  new URL("../lib/add/tr-cities.json", import.meta.url),
  JSON.stringify(rows, null, 2) + "\n"
);
