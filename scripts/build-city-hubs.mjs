import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** Capital display name -> tourist city list name when they differ. */
const TOURIST_CITY_NAME_OVERRIDES = {
  "Washington, D.C.": "Washington",
};

/** Optional Unsplash hero images per city slug. */
const HERO_IMAGES = {
  paris: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1502602898657-3e91760cbb34.jpg",
    alt: "Paris",
  },
  rome: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1552832230-c0197dd311b5.jpg",
    alt: "Rome",
  },
  london: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1513635269975-59663e0ac1ad.jpg",
    alt: "London",
  },
  tokyo: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1540959733332-eab4deabeeaf.jpg",
    alt: "Tokyo",
  },
  "new-delhi": {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1587474260584-136574528ed5.jpg",
    alt: "New Delhi",
  },
  cairo: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1547471080-7cc2caa01a7e.jpg",
    alt: "Cairo",
  },
  bangkok: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1508009603885-50cf7c579365.jpg",
    alt: "Bangkok",
  },
  madrid: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1539037116277-4db20889f2d4.jpg",
    alt: "Madrid",
  },
  berlin: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1775045309134-7525be4e2f2d.jpg",
    alt: "Brandenburg Gate, Berlin",
  },
  athens: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1555993539-1732b0258235.jpg",
    alt: "Athens",
  },
  lisbon: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1555881400-74d7acaacd8b.jpg",
    alt: "Lisbon",
  },
  seoul: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1517154421773-0529f29ea451.jpg",
    alt: "Seoul",
  },
  "mexico-city": {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1522083165195-3424ed129620.jpg",
    alt: "Mexico City",
  },
  "buenos-aires": {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1589909202802-8f4aadce1849.jpg",
    alt: "Buenos Aires",
  },
  jakarta: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1558618666-fcd25c85cd64.jpg",
    alt: "Jakarta",
  },
  hanoi: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1596422846543-75c6fc197f07.jpg",
    alt: "Hanoi",
  },
  ankara: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1650802315195-f58a8663c9be.jpg",
    alt: "Ankara",
  },
  canberra: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1672264597620-d792bb6de88d.jpg",
    alt: "Canberra",
  },
  brasilia: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1483729558449-99ef09a8c325.jpg",
    alt: "Brasília",
  },
  rabat: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1548013146-72479768bada.jpg",
    alt: "Rabat",
  },
  "washington-d-c": {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1501466044931-62695aada8e9.jpg",
    alt: "Washington, D.C.",
  },
  barcelona: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1583422409516-2895a77efded.jpg",
    alt: "Barcelona",
  },
  amsterdam: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1534351590666-13e3e96b5017.jpg",
    alt: "Amsterdam",
  },
  vienna: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/default-city.png",
    alt: "Vienna",
  },
  prague: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/default-city.png",
    alt: "Prague",
  },
  brussels: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/default-city.png",
    alt: "Brussels",
  },
  venice: {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/default-city.png",
    alt: "Venice",
  },
  "new-york": {
    url: "https://pub-fb30ec3d35d940109814405afa9ad457.r2.dev/city-hubs/photo-1496442226666-8d4d0e62e6e9.jpg",
    alt: "New York",
  },
};

function capitalToSlug(capital) {
  return capital
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function loadCountries() {
  return JSON.parse(fs.readFileSync(path.join(root, "data/countries.json"), "utf8")).countries;
}

function loadHomeBestCityHubs() {
  const filePath = path.join(root, "data/home-best-city-hubs.json");
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main() {
  const countries = loadCountries();
  const cities = {};

  for (const country of Object.values(countries)) {
    const slug = capitalToSlug(country.capital);
    const touristCityName = TOURIST_CITY_NAME_OVERRIDES[country.capital] ?? country.capital;
    const hero = HERO_IMAGES[slug];

    const entry = {
      slug,
      name: country.capital,
      countryCode: country.code,
      countrySlug: country.slug,
      countryName: country.name,
    };

    if (touristCityName !== country.capital) {
      entry.touristCityName = touristCityName;
    }

    if (hero) {
      entry.heroImage = hero.url;
      entry.heroImageAlt = hero.alt;
    }

    cities[slug] = entry;
  }

  for (const hub of loadHomeBestCityHubs()) {
    cities[hub.slug] = hub;
  }

  const output = {
    cities,
  };

  const outPath = path.join(root, "data/city-hubs.json");
  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Wrote ${Object.keys(cities).length} capital city hubs to data/city-hubs.json`);
}

main();
