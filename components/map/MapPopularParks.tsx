"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { POPULAR_PARKS, type PopularPark } from "@/lib/data/popular-parks";
import { quickAddPark, quickRemovePark } from "@/lib/client/park-destination-actions";
import { parkTypeLabel } from "@/lib/utils/park-type";
import { parkMessages, mapMessages } from "@/lib/i18n/client-messages";
import { useToast } from "@/components/ui/ToastProvider";
import type { VisitedPark } from "@/types/database";

type MapPopularParksProps = {
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
  visitedParks: VisitedPark[];
  onAdded?: (park: PopularPark) => void;
  onRemoved?: (park: PopularPark, countryRemoved: boolean) => void;
};

function parkId(park: PopularPark): string {
  return `${park.countryCode}:${park.parkType}:${park.parkName}`.toLowerCase();
}

function parkPayload(park: PopularPark) {
  return {
    park_name: park.parkName,
    park_type: park.parkType,
    country_code: park.countryCode,
    country_name: park.countryName,
  };
}

export function MapPopularParks({
  isLoggedIn = false,
  onRequireLogin,
  visitedParks,
  onAdded,
  onRemoved,
}: MapPopularParksProps) {
  const toast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [recentlyRemoved, setRecentlyRemoved] = useState<Set<string>>(new Set());

  const addedIds = useMemo(() => {
    const ids = new Set<string>();

    for (const park of visitedParks) {
      ids.add(
        `${park.country_code}:${park.park_type}:${park.park_name}`.toLowerCase()
      );
    }
    for (const id of recentlyAdded) {
      ids.add(id);
    }
    for (const id of recentlyRemoved) {
      ids.delete(id);
    }
    return ids;
  }, [visitedParks, recentlyAdded, recentlyRemoved]);

  const filteredParks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return POPULAR_PARKS;
    return POPULAR_PARKS.filter((park) =>
      `${park.label} ${park.parkName} ${park.countryName} ${park.countryCode} ${parkTypeLabel(park.parkType)}`
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

  async function handleAdd(park: PopularPark) {
    const id = parkId(park);
    if (addedIds.has(id) || busyId) return;
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }

    setBusyId(id);
    try {
      const result = await quickAddPark(parkPayload(park));

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
        toast.show(parkMessages.addedToast, 1000);
      }
      setQuery("");
      onAdded?.(park);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(park: PopularPark) {
    const id = parkId(park);
    if (!addedIds.has(id) || busyId) return;
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }

    setBusyId(id);
    try {
      const result = await quickRemovePark(parkPayload(park));

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
      toast.show(parkMessages.removedToast, 1000);
      onRemoved?.(park, result.countryRemoved);
    } finally {
      setBusyId(null);
    }
  }

  function renderRow(park: PopularPark) {
    const id = parkId(park);
    const added = addedIds.has(id);
    const busy = busyId === id;
    const displayName = `${park.label} (${park.countryCode})`;

    return (
      <li key={id}>
        <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-100">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{parkTypeLabel(park.parkType)}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            aria-label={
              added
                ? `${mapMessages.removePark} ${displayName}`
                : `${mapMessages.addPark} ${displayName}`
            }
            onClick={() => (added ? handleRemove(park) : handleAdd(park))}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-base font-semibold transition-colors disabled:opacity-60 ${
              added
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200 hover:border-red-500/60 hover:bg-red-500/15 hover:text-red-200"
                : "border-slate-600 text-slate-200 hover:border-emerald-500 hover:bg-emerald-500/15 hover:text-white"
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
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-600/80 bg-slate-900/95 px-3 py-2 text-left text-sm text-slate-100 shadow-lg backdrop-blur-sm transition-colors hover:border-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <span className="truncate">{mapMessages.popularParks}</span>
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
              placeholder={mapMessages.popularParksSearch}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="max-h-72 overflow-y-auto scrollbar-thin">
            {filteredParks.length > 0 ? (
              <ul className="py-1">{filteredParks.map(renderRow)}</ul>
            ) : (
              <p className="px-3 py-4 text-sm text-slate-500">
                {mapMessages.popularParksNoResults}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
