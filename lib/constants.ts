export const BRAND = {
  name: "TravelerPin",
  domain: "travelerpin.com",
  colors: {
    primary: "#2563eb",
    wbsBlue: "#1E96F3",
    wbsBlueHover: "#1a87db",
    visited: "#2563eb",
    unvisited: "#334155",
    wishlist: "#d97706",
    wishlistFill: "#f59e0b",
    pin: "#60a5fa",
    background: "#0f172a",
    surface: "#1e293b",
  },
} as const;

export const DEFAULT_CITY_HERO_IMAGE = "/images/city-default.png";
export const DEFAULT_CITY_HERO_ALT = "City skyline illustration";

export const DEFAULT_THEME_PARK_HERO_IMAGE = "/images/theme-park-default.png";
export const DEFAULT_THEME_PARK_HERO_ALT = "Theme park illustration";

export const DEFAULT_NATIONAL_PARK_HERO_IMAGE = "/images/national-park-default.png";
export const DEFAULT_NATIONAL_PARK_HERO_ALT = "Natura&Parks illustration";

export const LIMITS = {
  noteMaxLength: 1000,
  bioMaxLength: 500,
  displayNameMaxLength: 50,
  residenceMaxLength: 100,
  imageMaxWidth: 1080,
  avatarSize: 400,
  avatarMaxBytes: 5 * 1024 * 1024,
  usernameMin: 3,
  usernameMax: 30,
  passwordMin: 6,
  minCityPopulation: 100_000,
  /** Countries with this many 100k+ cities get largeCityCatalogMinPopulation. */
  largeCityCatalogMinCount: 100,
  largeCityCatalogMinPopulation: 500_000,
  /** Per-country catalog floor. Overrides the 100+ auto floor (China stays 2M). */
  countryMinCityPopulation: {
    CN: 2_000_000,
  },
  /** Well-known tourist cities kept even when below that country's floor. */
  countryKeepCities: {
    BR: ["Florianópolis", "Foz do Iguaçu", "Petrópolis", "Porto Seguro"],
    CN: [
      "Dali",
      "Guilin",
      "Haikou",
      "Kashgar",
      "Lhasa",
      "Lijiang",
      "Sanya",
      "Turpan",
      "Yangshuo",
      "Zhuhai",
    ],
    ID: ["Ambon", "Banda Aceh", "Jayapura", "Kupang", "Labuan Bajo", "Manado", "Mataram"],
    IN: [
      "Alappuzha",
      "Gaya",
      "Haridwar",
      "Kozhikode",
      "Port Blair",
      "Puducherry",
      "Puri",
      "Shimla",
      "Udaipur",
    ],
    JP: [
      "Beppu",
      "Hakodate",
      "Himeji",
      "Kamakura",
      "Kanazawa",
      "Matsumoto",
      "Matsuyama",
      "Nagasaki",
      "Naha",
      "Nara-shi",
      "Okinawa",
      "Otaru",
      "Takamatsu",
    ],
    MX: [
      "Campeche",
      "Ensenada",
      "La Paz",
      "Mazatlán",
      "Oaxaca",
      "Playa del Carmen",
      "Puerto Vallarta",
    ],
    RU: [
      "Kaliningrad",
      "Murmansk",
      "Petropavlovsk-Kamchatsky",
      "Petrozavodsk",
      "Pskov",
      "Sochi",
      "Ulan-Ude",
      "Yakutsk",
    ],
    US: [
      "Anchorage",
      "Atlanta",
      "Charleston",
      "Cincinnati",
      "Fort Lauderdale",
      "Honolulu",
      "Kansas City",
      "Miami",
      "Minneapolis",
      "New Orleans",
      "Orlando",
      "Pittsburgh",
      "Salt Lake City",
      "Savannah",
      "Scottsdale",
      "Tampa",
    ],
  },
  maxCityVisitDates: 24,
  maxPinPhotos: 1,
  maxPinPhotoBytes: 10 * 1024 * 1024,
} as const;
