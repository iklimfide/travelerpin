"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, Geometry, FeatureCollection } from "geojson";
import countriesLib from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { BRAND } from "@/lib/constants";
import { MAP_CSS } from "@/lib/theme/map-css-vars";
import {
  buildCountryFeatures,
  countryMetaFromFeature,
  countryCodesToNumericIds,
  normalizeCountryNumericId,
} from "@/lib/map/country";
import { type ContinentId, DEFAULT_MAP_CONTINENT } from "@/lib/map/continents";
import { filterVisibleForContinent, filterMainlandWorldFeatures, selectFitFeatures } from "@/lib/map/continent-fit";
import { clipCountryToMainland } from "@/lib/map/mainland";
import { fitProjectionFill } from "@/lib/map/projection-fit";
import { isTinyCountryOnMap } from "@/lib/map/micro-states";
import { MapCountryPin } from "@/components/map/MapCountryPin";
import { MapCountryLabel } from "@/components/map/MapCountryLabel";
import {
  MapMicroStateMarker,
  microStateMarkerColors,
} from "@/components/map/MapMicroStateMarker";

countriesLib.registerLocale(enLocale);

type WorldMapProps = {
  visitedCountryCodes: string[];
  wishlistCountryCodes?: string[];
  onCountryClick?: (country: { code: string; name: string }) => void;
  interactive?: boolean;
  continent?: ContinentId;
  /** Static profile map: inhabited mainlands, no polar clutter or micro-state dots. */
  mainlandWorld?: boolean;
};

const WIDTH = 800;
const HEIGHT = 450;
const MAP_PADDING = 16;
const MAINLAND_WORLD_PADDING = 0;

/** Drawn on the static profile map even when below the tiny-country pixel threshold. */
const PROFILE_MAP_ALWAYS_RENDER_CODES = new Set(["XK", "ME"]);

function buildProjection(
  continent: ContinentId,
  worldLand: FeatureCollection,
  fitLand: FeatureCollection,
  mainlandWorld = false
) {
  if (mainlandWorld && continent === "world") {
    return fitProjectionFill(
      geoNaturalEarth1(),
      WIDTH,
      HEIGHT,
      fitLand,
      MAINLAND_WORLD_PADDING
    );
  }

  const projection = geoNaturalEarth1();
  const extent: [[number, number], [number, number]] = [
    [MAP_PADDING, MAP_PADDING],
    [WIDTH - MAP_PADDING, HEIGHT - MAP_PADDING],
  ];

  const target =
    continent === "world" || fitLand.features.length === 0 ? worldLand : fitLand;

  return projection.fitExtent(extent, target);
}

export function WorldMap({
  visitedCountryCodes,
  wishlistCountryCodes = [],
  onCountryClick,
  interactive = true,
  continent = DEFAULT_MAP_CONTINENT,
  mainlandWorld = false,
}: WorldMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null);

  useEffect(() => {
    setMapReady(true);
  }, []);

  const countryFeatures = useMemo(() => buildCountryFeatures(), []);

  const mainlandFeatures = useMemo(() => {
    const clipped: Feature<Geometry>[] = [];

    for (const country of countryFeatures) {
      const meta = countryMetaFromFeature(country);
      if (!meta) {
        clipped.push(country);
        continue;
      }

      const mainland = clipCountryToMainland(country, meta.code);
      if (mainland) clipped.push(mainland);
    }

    return clipped;
  }, [countryFeatures]);

  const worldLand = useMemo((): FeatureCollection => {
    return { type: "FeatureCollection", features: mainlandFeatures };
  }, [mainlandFeatures]);

  const visibleFeatures = useMemo(() => {
    if (mainlandWorld) {
      const mainland = filterMainlandWorldFeatures(mainlandFeatures);
      if (continent === "world") return mainland;
      return filterVisibleForContinent(continent, mainland);
    }
    return filterVisibleForContinent(continent, mainlandFeatures);
  }, [continent, mainlandFeatures, mainlandWorld]);

  const fitFeatures = useMemo(() => {
    if (mainlandWorld && continent === "world") return visibleFeatures;
    return selectFitFeatures(continent, visibleFeatures);
  }, [continent, visibleFeatures, mainlandWorld]);

  const fitLand = useMemo((): FeatureCollection => {
    return { type: "FeatureCollection", features: fitFeatures };
  }, [fitFeatures]);

  const projection = useMemo(
    () => buildProjection(continent, worldLand, fitLand, mainlandWorld),
    [continent, worldLand, fitLand, mainlandWorld]
  );

  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const countryById = useMemo(() => {
    const map = new Map<string, Feature<Geometry>>();
    visibleFeatures.forEach((country, index) => {
      const id =
        country.id != null && country.id !== ""
          ? String(country.id)
          : `country-${index}`;
      map.set(id, country);
    });
    return map;
  }, [visibleFeatures]);

  const visitedNumericIds = useMemo(
    () => countryCodesToNumericIds(visitedCountryCodes),
    [visitedCountryCodes]
  );

  const wishlistNumericIds = useMemo(
    () => countryCodesToNumericIds(wishlistCountryCodes),
    [wishlistCountryCodes]
  );

  const visitedPinPositions = useMemo(() => {
    const positions: { id: string; x: number; y: number }[] = [];

    visibleFeatures.forEach((country, index) => {
      if (country.id == null || country.id === "") return;
      const numericId = normalizeCountryNumericId(country.id);
      if (!visitedNumericIds.has(numericId)) return;
      if (isTinyCountryOnMap(pathGenerator, country)) return;

      const [lng, lat] = geoCentroid(country);
      const point = projection([lng, lat]);
      if (!point) return;

      const id =
        country.id != null && country.id !== ""
          ? String(country.id)
          : `country-${index}`;

      positions.push({ id, x: point[0], y: point[1] });
    });

    return positions;
  }, [visibleFeatures, projection, pathGenerator, visitedNumericIds]);

  const handleCountryClick = useCallback(
    (country: Feature<Geometry>, id: string) => {
      if (!interactive || !onCountryClick) return;

      const meta = countryMetaFromFeature(country);
      if (!meta) return;

      onCountryClick(meta);
      setHoveredCountryId(id);
    },
    [interactive, onCountryClick]
  );

  const hoveredCountryLabel = useMemo(() => {
    if (!hoveredCountryId) return null;

    const country = countryById.get(hoveredCountryId);
    if (!country) return null;

    const meta = countryMetaFromFeature(country);
    if (!meta) return null;

    const [lng, lat] = geoCentroid(country);
    const point = projection([lng, lat]);
    if (!point) return null;

    return { x: point[0], y: point[1], name: meta.name };
  }, [countryById, hoveredCountryId, projection]);

  return (
    <div
      className={`relative w-full overflow-hidden aspect-[800/450] ${
        mainlandWorld ? "" : "border-y border-slate-700/50"
      }`}
      style={{ backgroundColor: MAP_CSS.background }}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="absolute inset-0 size-full [preserveAspectRatio:xMidYMid_meet]"
        role="img"
        aria-label="World travel map"
      >
        <rect width={WIDTH} height={HEIGHT} fill={MAP_CSS.background} />

        <g>
          {mapReady &&
            visibleFeatures.map((country, index) => {
            const id =
              country.id != null && country.id !== ""
                ? String(country.id)
                : `country-${index}`;
            const isVisited =
              country.id != null &&
              visitedNumericIds.has(normalizeCountryNumericId(country.id));
            const isWishlist =
              !isVisited &&
              country.id != null &&
              wishlistNumericIds.has(normalizeCountryNumericId(country.id));
            const isHovered = hoveredCountryId === id;
            const d = pathGenerator(country);
            const tiny = isTinyCountryOnMap(pathGenerator, country);
            const canClickCountry = interactive && !!onCountryClick;
            const meta = countryMetaFromFeature(country);
            const keepTinyOnProfile =
              mainlandWorld &&
              tiny &&
              (isVisited ||
                isWishlist ||
                (meta != null && PROFILE_MAP_ALWAYS_RENDER_CODES.has(meta.code)));

            if (mainlandWorld && tiny && !keepTinyOnProfile) {
              return null;
            }

            if (tiny && !keepTinyOnProfile) {
              const [lng, lat] = geoCentroid(country);
              const point = projection([lng, lat]);
              if (!point) return null;

              const colors = microStateMarkerColors(isVisited, isWishlist, isHovered);

              return (
                <MapMicroStateMarker
                  key={id}
                  x={point[0]}
                  y={point[1]}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isHovered ? 2 : isWishlist ? 1.5 : 1.5}
                  interactive={canClickCountry}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCountryClick(country, id);
                  }}
                  onMouseEnter={() => setHoveredCountryId(id)}
                  onMouseLeave={() => setHoveredCountryId(null)}
                />
              );
            }

            if (!d) return null;

            return (
              <path
                key={id}
                d={d}
                fill={
                  isVisited
                    ? BRAND.colors.visited
                    : isWishlist
                      ? BRAND.colors.wishlistFill
                      : MAP_CSS.unvisited
                }
                stroke={
                  isHovered
                    ? "#93c5fd"
                    : isWishlist
                      ? BRAND.colors.wishlist
                      : MAP_CSS.oceanStroke
                }
                strokeWidth={isHovered ? 1.5 : isWishlist ? 1 : 0.5}
                className={`transition-colors duration-200 ${
                  canClickCountry ? "cursor-pointer" : ""
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  handleCountryClick(country, id);
                }}
                onMouseEnter={() => setHoveredCountryId(id)}
                onMouseLeave={() => setHoveredCountryId(null)}
              />
            );
          })}

          {mapReady &&
            !mainlandWorld &&
            visitedPinPositions.map((pin) => (
              <MapCountryPin
                key={`pin-${pin.id}`}
                x={pin.x}
                y={pin.y}
                inverseScale={1}
              />
            ))}

          {mapReady && hoveredCountryLabel && (
            <MapCountryLabel
              x={hoveredCountryLabel.x}
              y={hoveredCountryLabel.y}
              name={hoveredCountryLabel.name}
              inverseScale={1}
            />
          )}
        </g>
      </svg>
    </div>
  );
}
