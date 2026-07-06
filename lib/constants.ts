export const BRAND = {
  name: "TravelerPin",
  domain: "travelerpin.com",
  colors: {
    primary: "#2563eb",
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
export const DEFAULT_NATIONAL_PARK_HERO_ALT = "National park illustration";

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
  maxCityVisitDates: 24,
} as const;
