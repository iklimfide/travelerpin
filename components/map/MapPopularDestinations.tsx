"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  POPULAR_DESTINATIONS,
  type PopularDestination,
} from "@/lib/data/popular-destinations";
import {
  quickAddDestination,
  quickRemoveDestination,
} from "@/lib/client/destination-actions";
import { destinationMessages, mapMessages } from "@/lib/i18n/client-messages";
import { useToast } from "@/components/ui/ToastProvider";
import type { VisitedCity, VisitedCountry } from "@/types/database";

type MapPopularDestinationsProps = {
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
  visitedCities: VisitedCity[];
  visitedCountries: VisitedCountry[];
  onAdded?: (destination: PopularDestination) => void;
  onRemoved?: (destination: PopularDestination, countryRemoved: boolean) => void;
};

function destinationId(destination: PopularDestination): string {
  if (destination.kind === "country") {
    return `country:${destination.countryCode}`.toLowerCase();
  }
  return `${destination.countryCode}:${destination.cityName}`.toLowerCase();
}

function destinationPayload(destination: PopularDestination) {
  return {
    kind: destination.kind,
    city_name: destination.cityName,
    country_code: destination.countryCode,
    country_name: destination.countryName,
    latitude: destination.latitude,
    longitude: destination.longitude,
  };
}

export function MapPopularDestinations({
  isLoggedIn = false,
  onRequireLogin,
  visitedCities,
  visitedCountries,
  onAdded,
  onRemoved,
}: MapPopularDestinationsProps) {
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [recentlyRemoved, setRecentlyRemoved] = useState<Set<string>>(new Set());

  const citiesByCountry = useMemo(() => {
    const counts = new Map<string, number>();
    for (const city of visitedCities) {
      const code = city.country_code.toUpperCase();
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return counts;
  }, [visitedCities]);

  const addedIds = useMemo(() => {
    const ids = new Set<string>();

    for (const country of visitedCountries) {
      const code = country.country_code.toUpperCase();
      if ((citiesByCountry.get(code) ?? 0) === 0) {
        ids.add(`country:${code}`.toLowerCase());
      }
    }
    for (const city of visitedCities) {
      ids.add(`${city.country_code}:${city.city_name}`.toLowerCase());
    }
    for (const id of recentlyAdded) {
      ids.add(id);
    }
    for (const id of recentlyRemoved) {
      ids.delete(id);
    }
    return ids;
  }, [visitedCities, visitedCountries, citiesByCountry, recentlyAdded, recentlyRemoved]);

  const filteredDestinations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return POPULAR_DESTINATIONS;
    return POPULAR_DESTINATIONS.filter((destination) =>
      `${destination.label} ${destination.cityName} ${destination.countryName} ${destination.countryCode}`
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  async function handleAdd(destination: PopularDestination) {
    const id = destinationId(destination);
    if (addedIds.has(id) || busyId) return;
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }

    setBusyId(id);
    try {
      const result = await quickAddDestination(destinationPayload(destination));

      if (!result.ok) {
        toast.show(result.error, 2500);
        return;
      }

      setRecentlyRemoved((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setRecentlyAdded((prev) => new Set(prev).add(id));
      if (result.added) {
        toast.show(destinationMessages.addedToast, 1000);
      }
      setQuery("");
      onAdded?.(destination);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(destination: PopularDestination) {
    const id = destinationId(destination);
    if (!addedIds.has(id) || busyId) return;
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }

    setBusyId(id);
    try {
      const result = await quickRemoveDestination(destinationPayload(destination));

      if (!result.ok) {
        toast.show(result.error, 2500);
        return;
      }

      if (!result.removed) return;

      setRecentlyAdded((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setRecentlyRemoved((prev) => new Set(prev).add(id));
      toast.show(destinationMessages.removedToast, 1000);
      onRemoved?.(destination, result.countryRemoved);
    } finally {
      setBusyId(null);
    }
  }

  function isAdded(destination: PopularDestination): boolean {
    const id = destinationId(destination);
    if (destination.kind === "country") {
      return addedIds.has(id);
    }
    return addedIds.has(id);
  }

  function renderRow(destination: PopularDestination) {
    const id = destinationId(destination);
    const added = isAdded(destination);
    const busy = busyId === id;
    const displayName =
      destination.kind === "country"
        ? `${destination.label} (${destination.countryCode})`
        : destination.label;

    return (
      <li key={id}>
        <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-100">{displayName}</p>
            {destination.kind === "city" ? (
              <p className="truncate text-xs text-slate-500">{destination.countryCode}</p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={busy}
            aria-label={
              added
                ? `${mapMessages.removeDestination} ${displayName}`
                : `${mapMessages.addDestination} ${displayName}`
            }
            onClick={() => (added ? handleRemove(destination) : handleAdd(destination))}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-base font-semibold transition-colors disabled:opacity-60 ${
              added
                ? "border-blue-500/50 bg-blue-500/15 text-blue-200 hover:border-red-500/60 hover:bg-red-500/15 hover:text-red-200"
                : "border-slate-600 text-slate-200 hover:border-blue-500 hover:bg-blue-500/15 hover:text-white"
            }`}
          >
            {added ? "−" : "+"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-600/80 bg-slate-900/95 px-3 py-2 text-left text-sm text-slate-100 shadow-lg backdrop-blur-sm transition-colors hover:border-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <span className="truncate">{mapMessages.popularDestinations}</span>
        <span className="shrink-0 text-slate-400" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-600/80 bg-slate-900/98 shadow-xl backdrop-blur-sm">
          <div className="border-b border-slate-800 p-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={mapMessages.popularDestinationsSearch}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="max-h-72 overflow-y-auto scrollbar-thin">
            {filteredDestinations.length > 0 ? (
              <ul className="py-1">{filteredDestinations.map(renderRow)}</ul>
            ) : (
              <p className="px-3 py-4 text-sm text-slate-500">
                {mapMessages.popularDestinationsNoResults}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
