"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { Feature, Geometry, FeatureCollection } from "geojson";
import countriesLib from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { BRAND } from "@/lib/constants";
import { MAP_CSS } from "@/lib/theme/map-css-vars";
import {
  buildCountryFeatures,
  countryMetaFromFeature,
  countryCodesToNumericIds,
  findCountryFeatureByCode,
  normalizeCountryNumericId,
} from "@/lib/map/country";
import { type ContinentId, DEFAULT_MAP_CONTINENT } from "@/lib/map/continents";
import { filterVisibleForContinent, filterMainlandWorldFeatures, selectFitFeatures } from "@/lib/map/continent-fit";
import { clipCountryToMainland } from "@/lib/map/mainland";
import { fitProjectionFill } from "@/lib/map/projection-fit";
import { clampFocusTransform, clampTransform, transformForCountryFocus, transformForFeature, transformToString } from "@/lib/map/zoom";
import { isTinyCountryOnMap } from "@/lib/map/micro-states";
import { MapCountryPin } from "@/components/map/MapCountryPin";
import { MapCityPin } from "@/components/map/MapCityPin";
import { MapCountryLabel } from "@/components/map/MapCountryLabel";
import {
  MapMicroStateMarker,
  microStateMarkerColors,
} from "@/components/map/MapMicroStateMarker";
import type { VisitedCity } from "@/types/database";

countriesLib.registerLocale(enLocale);

type WorldMapProps = {
  visitedCountryCodes: string[];
  wishlistCountryCodes?: string[];
  userCities?: VisitedCity[];
  onCountryClick?: (country: { code: string; name: string }) => void;
  onCityClick?: (city: VisitedCity) => void;
  interactive?: boolean;
  explorable?: boolean;
  continent?: ContinentId;
  focusRequest?: { code: string; nonce: number } | null;
  onFocusComplete?: () => void;
  pinnedCountryCode?: string | null;
  /** Static profile map: inhabited mainlands, no polar clutter or micro-state dots. */
  mainlandWorld?: boolean;
};

const WIDTH = 800;
const HEIGHT = 450;
const MAP_PADDING = 16;
const MAINLAND_WORLD_PADDING = 0;

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
  userCities = [],
  onCountryClick,
  onCityClick,
  interactive = true,
  explorable = false,
  continent = DEFAULT_MAP_CONTINENT,
  focusRequest = null,
  onFocusComplete,
  pinnedCountryCode = null,
  mainlandWorld = false,
}: WorldMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null);
  const [zoomK, setZoomK] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const mapGroupRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

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

  const inverseScale = 1 / zoomK;

  const focusedCityPins = useMemo(() => {
    if (!pinnedCountryCode) return [];

    const code = pinnedCountryCode.toUpperCase();
    const pins: { id: string; x: number; y: number; city: VisitedCity }[] = [];

    for (const city of userCities) {
      if (city.country_code.toUpperCase() !== code) continue;
      if (city.latitude == null || city.longitude == null) continue;
      const point = projection([city.longitude, city.latitude]);
      if (!point) continue;

      pins.push({
        id: city.id,
        x: point[0],
        y: point[1],
        city,
      });
    }

    return pins;
  }, [pinnedCountryCode, projection, userCities]);

  const syncZoomK = useCallback((transform: ZoomTransform) => {
    setZoomK(transform.k);
  }, []);

  const applyFocusTransform = useCallback((next: ZoomTransform) => {
    if (!mapGroupRef.current) return;

    const clamped = clampFocusTransform(next, WIDTH, HEIGHT);
    const mapGroup = select(mapGroupRef.current);
    mapGroup.attr("transform", transformToString(clamped));

    if (svgRef.current) {
      select(svgRef.current).property("__zoom", clamped);
    }

    syncZoomK(clamped);
  }, [syncZoomK]);

  const applyTransform = useCallback((next: ZoomTransform, animate = false) => {
    if (!mapGroupRef.current) return;

    const clamped = clampTransform(next, WIDTH, HEIGHT);
    const mapGroup = select(mapGroupRef.current);

    if (animate && svgRef.current && zoomBehaviorRef.current) {
      select(svgRef.current).call(zoomBehaviorRef.current.transform, clamped);
      return;
    }

    mapGroup.attr("transform", transformToString(clamped));
    if (svgRef.current) {
      select(svgRef.current).property("__zoom", clamped);
    }

    syncZoomK(clamped);
  }, [syncZoomK]);

  const skipNextResetRef = useRef(false);

  const resetZoom = useCallback(() => {
    if (!mapGroupRef.current) return;

    if (svgRef.current && zoomBehaviorRef.current) {
      select(svgRef.current).call(zoomBehaviorRef.current.transform, zoomIdentity);
      return;
    }

    select(mapGroupRef.current).attr("transform", transformToString(zoomIdentity));
    syncZoomK(zoomIdentity);
  }, [syncZoomK]);

  const focusCountry = useCallback(
    (country: Feature<Geometry>) => {
      const next = transformForCountryFocus(pathGenerator, country, WIDTH, HEIGHT);
      applyFocusTransform(next);
    },
    [applyFocusTransform, pathGenerator]
  );

  useEffect(() => {
    if (!mapReady) return;

    if (focusRequest) {
      const country = findCountryFeatureByCode(mainlandFeatures, focusRequest.code, continent);
      if (!country) {
        onFocusComplete?.();
        return;
      }

      const id =
        country.id != null && country.id !== "" ? String(country.id) : null;
      if (id) setHoveredCountryId(id);

      focusCountry(country);
      skipNextResetRef.current = true;
      onFocusComplete?.();
      return;
    }

    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
      return;
    }

    resetZoom();
  }, [
    continent,
    focusCountry,
    focusRequest,
    mainlandFeatures,
    mapReady,
    onFocusComplete,
    projection,
    resetZoom,
  ]);

  useEffect(() => {
    if (!explorable || !svgRef.current || !mapGroupRef.current) return;

    const svg = select(svgRef.current);
    const mapGroup = select(mapGroupRef.current);

    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .filter((event) => {
        if (event.type === "wheel") return true;
        if (event.type === "dblclick") return true;
        return event.button === 0;
      })
      .on("zoom", (event) => {
        const clamped = clampTransform(event.transform, WIDTH, HEIGHT);
        mapGroup.attr("transform", transformToString(clamped));
        svg.property("__zoom", clamped);
        setZoomK(clamped.k);
      });

    zoomBehaviorRef.current = behavior;
    svg.call(behavior);

    svg.on("dblclick.zoom", (event) => {
      event.preventDefault();
      applyTransform(zoomIdentity, true);
    });

    return () => {
      svg.on(".zoom", null);
      zoomBehaviorRef.current = null;
    };
  }, [applyTransform, explorable]);

  const handleCountryClick = useCallback(
    (country: Feature<Geometry>, id: string) => {
      if (!interactive || !onCountryClick) return;

      const meta = countryMetaFromFeature(country);
      if (!meta) return;

      if (explorable) {
        focusCountry(country);
      }
      onCountryClick(meta);
      setHoveredCountryId(id);
    },
    [explorable, focusCountry, interactive, onCountryClick]
  );

  const hoveredCountryLabel = useMemo(() => {
    if (!hoveredCountryId || pinnedCountryCode) return null;

    const country = countryById.get(hoveredCountryId);
    if (!country) return null;

    const meta = countryMetaFromFeature(country);
    if (!meta) return null;

    const [lng, lat] = geoCentroid(country);
    const point = projection([lng, lat]);
    if (!point) return null;

    return { x: point[0], y: point[1], name: meta.name };
  }, [countryById, hoveredCountryId, pinnedCountryCode, projection]);

  return (
    <div
      className={`relative w-full overflow-hidden aspect-[800/450] ${
        mainlandWorld ? "" : "border-y border-slate-700/50"
      } ${explorable ? "touch-none" : ""}`}
      style={{ backgroundColor: MAP_CSS.background }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={`absolute inset-0 size-full [preserveAspectRatio:xMidYMid_meet] ${
          explorable ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        role="img"
        aria-label="World travel map"
      >
        <rect width={WIDTH} height={HEIGHT} fill={MAP_CSS.background} />

        <g ref={mapGroupRef}>
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

            if (mainlandWorld && tiny) {
              return null;
            }

            if (tiny) {
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
            !pinnedCountryCode &&
            visitedPinPositions.map((pin) => (
              <MapCountryPin
                key={`pin-${pin.id}`}
                x={pin.x}
                y={pin.y}
                inverseScale={inverseScale}
              />
            ))}

          {mapReady &&
            focusedCityPins.map((pin) => (
              <MapCityPin
                key={`city-${pin.id}`}
                x={pin.x}
                y={pin.y}
                name={pin.city.city_name}
                inverseScale={inverseScale}
                interactive={interactive && !!onCityClick}
                onClick={() => onCityClick?.(pin.city)}
              />
            ))}

          {mapReady && hoveredCountryLabel && zoomK < 1.25 && (
            <MapCountryLabel
              x={hoveredCountryLabel.x}
              y={hoveredCountryLabel.y}
              name={hoveredCountryLabel.name}
              inverseScale={inverseScale}
            />
          )}
        </g>
      </svg>
    </div>
  );
}
