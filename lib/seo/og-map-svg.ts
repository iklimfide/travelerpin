import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import countries from "world-atlas/countries-110m.json";
import countriesLib from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { BRAND } from "@/lib/constants";
import type { VisitedCity } from "@/types/database";

countriesLib.registerLocale(enLocale);

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 420;
const MAX_PINS = 80;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SHARE_CARD_MAP = {
  background: "#dceefb",
  unvisited: "#bdd7ef",
  visited: "#2563eb",
  wishlistFill: "#f59e0b",
  wishlist: "#d97706",
  pin: "#1d4ed8",
  stroke: "#ffffff",
} as const;

export function buildOgMapSvg(
  visitedCountryCodes: string[],
  cities: VisitedCity[],
  wishlistCountryCodes: string[] = [],
  variant: "dark" | "share-card" = "dark"
): string {
  const topology = countries as unknown as Topology<{ countries: GeometryCollection }>;
  const countryFeatures = feature(topology, topology.objects.countries).features;
  const land = feature(topology, topology.objects.countries);
  const projection = geoNaturalEarth1().fitSize([MAP_WIDTH, MAP_HEIGHT], land);
  const pathGenerator = geoPath(projection);

  const visitedNumericIds = new Set(
    visitedCountryCodes
      .map((code) => countriesLib.alpha2ToNumeric(code))
      .filter(Boolean)
      .map((n) => String(n).padStart(3, "0"))
  );

  const wishlistNumericIds = new Set(
    wishlistCountryCodes
      .map((code) => countriesLib.alpha2ToNumeric(code))
      .filter(Boolean)
      .map((n) => String(n).padStart(3, "0"))
  );

  const countryPaths = countryFeatures
    .map((country, index) => {
      const id =
        country.id != null && country.id !== ""
          ? String(country.id)
          : `country-${index}`;
      const isVisited =
        country.id != null && visitedNumericIds.has(String(country.id));
      const isWishlist =
        !isVisited &&
        country.id != null &&
        wishlistNumericIds.has(String(country.id));
      const d = pathGenerator(country);
      if (!d) return "";

      const palette = variant === "share-card" ? SHARE_CARD_MAP : BRAND.colors;
      const fill = isVisited
        ? palette.visited
        : isWishlist
          ? palette.wishlistFill
          : palette.unvisited;
      const stroke = isWishlist
        ? palette.wishlist
        : variant === "share-card"
          ? SHARE_CARD_MAP.stroke
          : BRAND.colors.background;
      const strokeWidth = isWishlist ? "1.2" : "0.6";

      return `<path d="${escapeXml(d)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
    })
    .join("");

  const pinCities = cities.slice(0, MAX_PINS);
  const pins = pinCities
    .map((city) => {
      if (city.latitude == null || city.longitude == null) return "";
      const point = projection([city.longitude, city.latitude]);
      if (!point) return "";
      const [x, y] = point;
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="5" fill="${variant === "share-card" ? SHARE_CARD_MAP.pin : BRAND.colors.pin}" stroke="#ffffff" stroke-width="1.5"/>`;
    })
    .join("");

  const bg = variant === "share-card" ? SHARE_CARD_MAP.background : BRAND.colors.background;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" width="${MAP_WIDTH}" height="${MAP_HEIGHT}">
  <rect width="${MAP_WIDTH}" height="${MAP_HEIGHT}" fill="${bg}"/>
  <g>${countryPaths}</g>
  <g>${pins}</g>
</svg>`;
}

/** Edge-safe data URL for next/og ImageResponse. */
export function ogMapDataUrl(
  visitedCountryCodes: string[],
  cities: VisitedCity[],
  wishlistCountryCodes: string[] = [],
  variant: "dark" | "share-card" = "dark"
): string {
  const svg = buildOgMapSvg(visitedCountryCodes, cities, wishlistCountryCodes, variant);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function shareCardMapDataUrl(
  visitedCountryCodes: string[],
  cities: VisitedCity[]
): string {
  return ogMapDataUrl(visitedCountryCodes, cities, [], "share-card");
}

/** Rasterize map SVG to PNG — avoids Satori/resvg colourspace failures on Windows. */
export async function ogMapPngDataUrl(
  visitedCountryCodes: string[],
  cities: VisitedCity[],
  wishlistCountryCodes: string[] = [],
  variant: "dark" | "share-card" = "dark"
): Promise<string> {
  const svg = buildOgMapSvg(visitedCountryCodes, cities, wishlistCountryCodes, variant);
  const sharp = (await import("sharp")).default;
  const png = await sharp(Buffer.from(svg)).toColourspace("srgb").png({ compressionLevel: 6 }).toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
