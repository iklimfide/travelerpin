"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compareCitiesForAddModal } from "@/lib/add/city-list-sort";
import { addCitiesBatch, addCity } from "@/lib/client/city-actions";
import { formatMessage, useAppMessages } from "@/lib/i18n/client-messages";
import { canonicalCityKey, citiesAreSame } from "@/lib/utils/city-aliases";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";

type TouristCity = {
  countryCode: string;
  name: string;
  latitude: number;
  longitude: number;
  highlighted?: boolean;
  isCapital?: boolean;
};

type CountryCityPickerProps = {
  countryCode: string;
  countryName: string;
  existingCityNames: string[];
  onAdded: () => void;
};

const MIN_FILTER_LENGTH = 2;
const CUSTOM_CITY_TOAST_DELAY_MS = 500;

function cityId(city: TouristCity): string {
  return canonicalCityKey(city.countryCode, city.name);
}

export function CountryCityPicker({
  countryCode,
  countryName,
  existingCityNames,
  onAdded,
}: CountryCityPickerProps) {
  const { common: commonMessages, map: mapMessages, city: cityMessages } = useAppMessages();
  const modal = useModal();
  const toast = useToast();

  const [allCities, setAllCities] = useState<TouristCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastPromptKeyRef = useRef<string | null>(null);

  const existingNames = useMemo(
    () => existingCityNames,
    [existingCityNames]
  );

  function isExistingCity(cityName: string): boolean {
    return existingNames.some((name) => citiesAreSame(countryCode, name, cityName));
  }

  useEffect(() => {
    setSelectedIds(new Set());
    setFilter("");
    setLoading(true);
    lastPromptKeyRef.current = null;

    fetch(`/api/cities/tourist?country=${encodeURIComponent(countryCode)}`)
      .then(async (res) => {
        if (!res.ok) {
          setAllCities([]);
          return;
        }
        const data = await res.json();
        setAllCities(data.cities ?? []);
      })
      .catch(() => setAllCities([]))
      .finally(() => setLoading(false));
  }, [countryCode]);

  const displayCities = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase("tr");
    const cities =
      q.length < MIN_FILTER_LENGTH
        ? allCities
        : allCities.filter((city) => {
            const name = city.name.toLocaleLowerCase("tr");
            return name.includes(q) || name.split(/\s+/).some((word) => word.startsWith(q));
          });

    return [...cities].sort(compareCitiesForAddModal);
  }, [allCities, filter]);

  const selectableCities = useMemo(() => {
    return displayCities.filter((city) => !isExistingCity(city.name));
  }, [displayCities, existingNames, countryCode]);

  const selectedCount = useMemo(() => {
    return selectableCities.filter((city) => selectedIds.has(cityId(city))).length;
  }, [selectableCities, selectedIds]);

  const trimmedFilter = filter.trim();

  const canAddCustomCity = useMemo(() => {
    if (trimmedFilter.length < MIN_FILTER_LENGTH) return false;
    if (isExistingCity(trimmedFilter)) return false;
    if (displayCities.length > 0) return false;

    const normalized = trimmedFilter.toLocaleLowerCase("tr");
    const exactInList = allCities.some(
      (city) => city.name.toLocaleLowerCase("tr") === normalized
    );

    return !exactInList;
  }, [allCities, displayCities.length, existingNames, trimmedFilter]);

  const handleAddCustomCity = useCallback(async () => {
    if (trimmedFilter.length < MIN_FILTER_LENGTH) return;
    if (isExistingCity(trimmedFilter)) return;

    setSaving(true);

    try {
      const result = await addCity({
        city_name: trimmedFilter,
        country_code: countryCode,
        country_name: countryName,
      });

      if (!result.ok) {
        await modal.alert(result.error, { variant: "error" });
        throw new Error(result.error);
      }

      toast.show(mapMessages.cityAdded);
      lastPromptKeyRef.current = null;
      setFilter("");
      onAdded();
    } finally {
      setSaving(false);
    }
  }, [
    countryCode,
    countryName,
    existingNames,
    modal,
    onAdded,
    toast,
    trimmedFilter,
  ]);

  useEffect(() => {
    if (loading || saving || !canAddCustomCity || selectedCount > 0) {
      return;
    }

    const promptKey = `${countryCode}:${trimmedFilter.toLowerCase()}`;
    const timer = window.setTimeout(() => {
      if (lastPromptKeyRef.current === promptKey) return;
      lastPromptKeyRef.current = promptKey;

      toast.showAction({
        message: formatMessage(mapMessages.customCityNotFoundInCountry, {
          city: formatCityDisplayName(trimmedFilter),
          country: countryName,
        }),
        actionLabel: mapMessages.customCityAdd,
        dismissLabel: commonMessages.no,
        accent: "blue",
        onAction: handleAddCustomCity,
      });
    }, CUSTOM_CITY_TOAST_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [
    canAddCustomCity,
    countryCode,
    countryName,
    handleAddCustomCity,
    loading,
    saving,
    selectedCount,
    toast,
    trimmedFilter,
  ]);

  useEffect(() => {
    if (!canAddCustomCity) {
      lastPromptKeyRef.current = null;
      toast.dismiss();
    }
  }, [canAddCustomCity, toast]);

  function toggleCity(city: TouristCity) {
    const id = cityId(city);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedCount === selectableCities.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(selectableCities.map(cityId)));
  }

  async function handleAddSelected() {
    const picked = selectableCities.filter((city) => selectedIds.has(cityId(city)));
    if (picked.length === 0) return;

    setSaving(true);

    try {
      const result = await addCitiesBatch({
        country_code: countryCode,
        country_name: countryName,
        cities: picked.map((city) => ({
          city_name: city.name,
          latitude: city.latitude,
          longitude: city.longitude,
        })),
      });

      if (!result.ok) {
        await modal.alert(result.error, { variant: "error" });
        throw new Error(result.error);
      }

      if (result.added > 0) {
        toast.show(formatMessage(mapMessages.citiesAdded, { count: result.added }));
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
        <p className="text-sm font-medium text-white">{mapMessages.pickCities}</p>
        <p className="mt-0.5 text-xs text-slate-500">{mapMessages.pickCitiesHint}</p>
      </div>

      <input
        type="search"
        value={filter}
        onChange={(e) => {
          lastPromptKeyRef.current = null;
          setFilter(e.target.value);
        }}
        placeholder={mapMessages.filterCities}
        className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        autoComplete="off"
      />

      {selectableCities.length > 0 && (
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>
            {formatMessage(cityMessages.cityCount, {
              count: displayCities.length,
              selected: selectedCount,
            })}
          </span>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-blue-400 hover:text-blue-300"
          >
            {selectedCount === selectableCities.length
              ? cityMessages.deselectAll
              : cityMessages.selectAll}
          </button>
        </div>
      )}

      <ul className="max-h-52 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 scrollbar-thin">
        {loading ? (
          <li className="px-3 py-6 text-center text-sm text-slate-500">
            {mapMessages.citiesLoading}
          </li>
        ) : displayCities.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-slate-500">
            {mapMessages.citiesEmpty}
          </li>
        ) : (
          displayCities.map((city) => {
            const id = cityId(city);
            const onMap = isExistingCity(city.name);
            const checked = onMap || selectedIds.has(id);

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
                    onChange={() => toggleCity(city)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/40 disabled:opacity-60"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-100" title={city.name}>
                      {city.name}
                    </span>
                    {onMap && (
                      <span className="mt-0.5 block text-xs text-blue-400/80">
                        {mapMessages.cityOnMap}
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
        className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selectedCount > 0
          ? formatMessage(mapMessages.addSelectedCities, { count: selectedCount })
          : mapMessages.pickCities}
      </button>
    </div>
  );
}
