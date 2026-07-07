"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addPark, addParksBatch } from "@/lib/client/park-actions";
import { commonMessages, formatMessage, mapMessages, parkMessages } from "@/lib/i18n/client-messages";
import { matchesParkTypeFilter, parkTypeLabel } from "@/lib/utils/park-type";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";
import type { ParkType } from "@/types/database";

type TouristPark = {
  parkType: ParkType;
  countryCode: string;
  name: string;
  latitude: number;
  longitude: number;
};

type CountryParkPickerProps = {
  countryCode: string;
  countryName: string;
  existingParkKeys: string[];
  onAdded: () => void;
};

const MIN_FILTER_LENGTH = 2;
const CUSTOM_PARK_TOAST_DELAY_MS = 500;
const ALL_TYPES = "ALL";

function parkKey(park: TouristPark): string {
  return `${park.parkType}:${park.name}`;
}

function parkListId(park: TouristPark): string {
  return `${park.countryCode}:${park.parkType}:${park.name}`;
}

export function CountryParkPicker({
  countryCode,
  countryName,
  existingParkKeys,
  onAdded,
}: CountryParkPickerProps) {
  const modal = useModal();
  const toast = useToast();

  const [allParks, setAllParks] = useState<TouristPark[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customParkType, setCustomParkType] = useState<ParkType>("national_park");
  const lastPromptKeyRef = useRef<string | null>(null);

  const existingKeys = useMemo(
    () => new Set(existingParkKeys.map((key) => key.toLowerCase())),
    [existingParkKeys]
  );

  useEffect(() => {
    setSelectedIds(new Set());
    setFilter("");
    setTypeFilter(ALL_TYPES);
    setLoading(true);
    lastPromptKeyRef.current = null;

    fetch(`/api/parks/tourist?country=${encodeURIComponent(countryCode)}`)
      .then(async (res) => {
        if (!res.ok) {
          setAllParks([]);
          return;
        }
        const data = await res.json();
        setAllParks(data.parks ?? []);
      })
      .catch(() => setAllParks([]))
      .finally(() => setLoading(false));
  }, [countryCode]);

  const displayParks = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase("tr");
    let parks = allParks;

    if (typeFilter !== ALL_TYPES) {
      parks = parks.filter((park) =>
        matchesParkTypeFilter(park.parkType, typeFilter as ParkType)
      );
    }

    if (q.length >= MIN_FILTER_LENGTH) {
      parks = parks.filter((park) => {
        const name = park.name.toLocaleLowerCase("tr");
        return name.includes(q) || name.split(/\s+/).some((word) => word.startsWith(q));
      });
    }

    return [...parks].sort((a, b) =>
      a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
    );
  }, [allParks, filter, typeFilter]);

  const selectableParks = useMemo(() => {
    return displayParks.filter((park) => !existingKeys.has(parkKey(park).toLowerCase()));
  }, [displayParks, existingKeys]);

  const selectedCount = useMemo(() => {
    return selectableParks.filter((park) => selectedIds.has(parkListId(park))).length;
  }, [selectableParks, selectedIds]);

  const trimmedFilter = filter.trim();

  const canAddCustomPark = useMemo(() => {
    if (trimmedFilter.length < MIN_FILTER_LENGTH) return false;

    const key = `${customParkType}:${trimmedFilter.toLowerCase()}`;
    if (existingKeys.has(key)) return false;
    if (displayParks.length > 0) return false;

    const normalized = trimmedFilter.toLocaleLowerCase("tr");
    const exactInList = allParks.some(
      (park) =>
        matchesParkTypeFilter(park.parkType, customParkType) &&
        park.name.toLocaleLowerCase("tr") === normalized
    );

    return !exactInList;
  }, [allParks, customParkType, displayParks.length, existingKeys, trimmedFilter]);

  const handleAddCustomPark = useCallback(async () => {
    if (trimmedFilter.length < MIN_FILTER_LENGTH) return;

    setSaving(true);

    try {
      const result = await addPark({
        park_name: trimmedFilter,
        park_type: customParkType,
        country_code: countryCode,
        country_name: countryName,
      });

      if (!result.ok) {
        await modal.alert(result.error, { variant: "error" });
        throw new Error(result.error);
      }

      toast.show(mapMessages.parkAdded);
      lastPromptKeyRef.current = null;
      setFilter("");
      onAdded();
    } finally {
      setSaving(false);
    }
  }, [countryCode, countryName, customParkType, modal, onAdded, toast, trimmedFilter]);

  useEffect(() => {
    if (loading || saving || !canAddCustomPark || selectedCount > 0) {
      return;
    }

    const promptKey = `${countryCode}:${customParkType}:${trimmedFilter.toLowerCase()}`;
    const timer = window.setTimeout(() => {
      if (lastPromptKeyRef.current === promptKey) return;
      lastPromptKeyRef.current = promptKey;

      toast.showAction({
        message: formatMessage(mapMessages.customParkNotFoundInCountry, {
          park: formatCityDisplayName(trimmedFilter),
          country: countryName,
        }),
        actionLabel: mapMessages.customParkAdd,
        dismissLabel: commonMessages.no,
        accent: "emerald",
        onAction: handleAddCustomPark,
      });
    }, CUSTOM_PARK_TOAST_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    canAddCustomPark,
    countryCode,
    countryName,
    customParkType,
    handleAddCustomPark,
    loading,
    saving,
    selectedCount,
    toast,
    trimmedFilter,
  ]);

  useEffect(() => {
    if (!canAddCustomPark) {
      lastPromptKeyRef.current = null;
      toast.dismiss();
    }
  }, [canAddCustomPark, toast]);

  function togglePark(park: TouristPark) {
    const id = parkListId(park);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedCount === selectableParks.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(selectableParks.map(parkListId)));
  }

  async function handleAddSelected() {
    const picked = selectableParks.filter((park) => selectedIds.has(parkListId(park)));
    if (picked.length === 0) return;

    setSaving(true);

    try {
      const result = await addParksBatch({
        country_code: countryCode,
        country_name: countryName,
        parks: picked.map((park) => ({
          park_name: park.name,
          park_type: park.parkType,
          latitude: park.latitude,
          longitude: park.longitude,
        })),
      });

      if (!result.ok) {
        await modal.alert(result.error, { variant: "error" });
        throw new Error(result.error);
      }

      if (result.added > 0) {
        toast.show(formatMessage(mapMessages.parksAdded, { count: result.added }));
      }

      setSelectedIds(new Set());
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-slate-800 px-5 py-4">
      <div className="mb-3">
        <p className="text-sm font-medium text-white">{mapMessages.pickParks}</p>
        <p className="mt-0.5 text-xs text-slate-500">{mapMessages.pickParksHint}</p>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {[
          { value: ALL_TYPES, label: parkMessages.allTypes },
          { value: "national_park", label: parkMessages.nationalPark },
          { value: "theme_park", label: parkMessages.themePark },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTypeFilter(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === option.value
                ? "bg-emerald-600 text-white"
                : "border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={filter}
        onChange={(e) => {
          lastPromptKeyRef.current = null;
          setFilter(e.target.value);
        }}
        placeholder={mapMessages.filterParks}
        className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        autoComplete="off"
      />

      {canAddCustomPark && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{parkMessages.customTypeLabel}</span>
          <select
            value={customParkType}
            onChange={(e) => setCustomParkType(e.target.value as ParkType)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
          >
            <option value="national_park">{parkMessages.nationalPark}</option>
            <option value="theme_park">{parkMessages.themePark}</option>
          </select>
        </div>
      )}

      {selectableParks.length > 0 && (
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>
            {formatMessage(parkMessages.parkCount, {
              count: displayParks.length,
              selected: selectedCount,
            })}
          </span>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-emerald-400 hover:text-emerald-300"
          >
            {selectedCount === selectableParks.length
              ? parkMessages.deselectAll
              : parkMessages.selectAll}
          </button>
        </div>
      )}

      <ul className="max-h-52 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 scrollbar-thin">
        {loading ? (
          <li className="px-3 py-6 text-center text-sm text-slate-500">
            {mapMessages.parksLoading}
          </li>
        ) : displayParks.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-slate-500">
            {mapMessages.parksEmpty}
          </li>
        ) : (
          displayParks.map((park) => {
            const id = parkListId(park);
            const onMap = existingKeys.has(parkKey(park).toLowerCase());
            const checked = onMap || selectedIds.has(id);
            const typeLabel = parkTypeLabel(park.parkType);

            return (
              <li key={id} className="border-b border-slate-800/80 last:border-b-0">
                <label
                  className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 ${
                    onMap ? "cursor-default opacity-60" : "hover:bg-slate-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={onMap || saving}
                    onChange={() => togglePark(park)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/40 disabled:opacity-60"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-slate-100">{park.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{typeLabel}</span>
                    {onMap && (
                      <span className="mt-0.5 block text-xs text-emerald-400/80">
                        {mapMessages.parkOnMap}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })
        )}
      </ul>

      <button
        type="button"
        onClick={handleAddSelected}
        disabled={saving || selectedCount === 0}
        className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selectedCount > 0
          ? formatMessage(mapMessages.addSelectedParks, { count: selectedCount })
          : mapMessages.pickParks}
      </button>
    </div>
  );
}
