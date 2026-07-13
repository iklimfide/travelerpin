import { getCountryName } from "@/lib/data/countries";
import { resolveCountryHubSlug } from "@/lib/data/country-hubs";
import { countryPath } from "@/lib/seo/site";
import { canonicalCityKey, canonicalCityName } from "@/lib/utils/city-aliases";
import { cityPlacePath } from "@/lib/utils/hub-place-path";
import type { NextRouteStop, NextRouteStopKind } from "@/types/database";

export type NextRouteStopDisplay = {
  title: string;
  subtitle: string | null;
  countryCode: string;
};

export const NEXT_ROUTE_MAX_STOPS = 24;

const STOP_KINDS = new Set<NextRouteStopKind>(["country", "city"]);

function isStopKind(value: unknown): value is NextRouteStopKind {
  return typeof value === "string" && STOP_KINDS.has(value as NextRouteStopKind);
}

function normalizeStop(raw: unknown): NextRouteStop | null {
  if (!raw || typeof raw !== "object") return null;

  const row = raw as Record<string, unknown>;
  const kind = row.kind;
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const id = typeof row.id === "string" ? row.id.trim() : "";

  if (!isStopKind(kind) || !name || !id) return null;

  const countryCode =
    typeof row.countryCode === "string" ? row.countryCode.toUpperCase() : undefined;
  const countryName = typeof row.countryName === "string" ? row.countryName.trim() : undefined;
  const slug = typeof row.slug === "string" ? row.slug.trim() || null : null;
  const href = typeof row.href === "string" ? row.href.trim() || null : null;

  return {
    id,
    kind,
    name,
    ...(countryCode ? { countryCode } : {}),
    ...(countryName ? { countryName } : {}),
    ...(slug !== null ? { slug } : {}),
    ...(href !== null ? { href } : {}),
  };
}

export function parseNextRoute(value: unknown): NextRouteStop[] {
  if (!Array.isArray(value)) return [];

  const stops: NextRouteStop[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    let stop = normalizeStop(item);
    if (!stop) continue;

    if (stop.kind === "city" && stop.countryCode) {
      const code = stop.countryCode.toUpperCase();
      const name = canonicalCityName(code, stop.name);
      if (name !== stop.name) {
        const href = cityPlacePath(code, name);
        stop = {
          ...stop,
          name,
          countryCode: code,
          countryName: stop.countryName ?? getCountryName(code),
          slug: href.split("/").pop() ?? null,
          href,
        };
      }
    }

    const key = stopDedupeKey(stop);
    if (seen.has(key)) continue;
    seen.add(key);

    stops.push(stop);
    if (stops.length >= NEXT_ROUTE_MAX_STOPS) break;
  }

  return stops;
}

export function createNextRouteStopId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `stop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildCountryStop(code: string, name: string): NextRouteStop {
  const slug = resolveCountryHubSlug(code, name);
  return {
    id: createNextRouteStopId(),
    kind: "country",
    name,
    countryCode: code.toUpperCase(),
    countryName: name,
    slug,
    href: slug ? countryPath(slug) : null,
  };
}

export function buildCityStop(
  cityName: string,
  countryCode: string,
  countryName: string
): NextRouteStop {
  const href = cityPlacePath(countryCode, cityName);
  const slug = href.split("/").pop() ?? null;
  return {
    id: createNextRouteStopId(),
    kind: "city",
    name: cityName,
    countryCode: countryCode.toUpperCase(),
    countryName,
    slug,
    href,
  };
}

export function stopDedupeKey(stop: Pick<NextRouteStop, "kind" | "name" | "countryCode">): string {
  const code = stop.countryCode?.toUpperCase() ?? "";
  if (stop.kind === "city" && code) {
    return `city:${canonicalCityKey(code, stop.name)}`;
  }
  return `${stop.kind}:${code}:${stop.name.trim().toLowerCase()}`;
}

export function areNextRouteStopsEqual(a: NextRouteStop[], b: NextRouteStop[]): boolean {
  if (a.length !== b.length) return false;

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (
      left.id !== right.id ||
      left.kind !== right.kind ||
      left.name !== right.name ||
      (left.countryCode ?? "") !== (right.countryCode ?? "")
    ) {
      return false;
    }
  }

  return true;
}

export function getNextRouteStopDisplay(stop: NextRouteStop): NextRouteStopDisplay {
  const countryCode = stop.countryCode?.toUpperCase() ?? "";
  const countryName = stop.countryName ?? (countryCode ? getCountryName(countryCode) : stop.name);

  if (stop.kind === "city") {
    return {
      title: canonicalCityName(countryCode, stop.name),
      subtitle: countryName,
      countryCode,
    };
  }

  const title = stop.name || countryName;
  return {
    title,
    subtitle: title !== countryName ? countryName : null,
    countryCode,
  };
}
