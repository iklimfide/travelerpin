"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { countryMessages, wishlistMessages } from "@/lib/i18n/client-messages";
import { CountryCityPickerSheet } from "@/components/map/CountryCityPickerSheet";
import { COUNTRY_LIST, searchCountries, getCountryName } from "@/lib/data/countries";
import { addVisitedCountry } from "@/lib/client/country-actions";
import {
  countryHasMappedPlaces,
  isCountryRemoveBlockedByPlacesError,
} from "@/lib/utils/country-remove";
import type { VisitedCity, VisitedCountry, VisitedPark, WishlistCountry } from "@/types/database";

type CountryManagerProps = {
  visitedCountries: VisitedCountry[];
  wishlistCountries: WishlistCountry[];
  visitedCountryCodes: string[];
  visitedCities: VisitedCity[];
  visitedParks?: VisitedPark[];
  embedded?: boolean;
};

type CountryRow = {
  code: string;
  name: string;
  visitedId?: string;
  wishlistId?: string;
  isVisited: boolean;
  visitedViaPlacesOnly: boolean;
  isWishlist: boolean;
};

export function CountryManager({
  visitedCountries,
  wishlistCountries,
  visitedCountryCodes,
  visitedCities,
  visitedParks = [],
  embedded = false,
}: CountryManagerProps) {
  const router = useRouter();
  const modal = useModal();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [cityPickerTarget, setCityPickerTarget] = useState<{
    code: string;
    name: string;
  } | null>(null);

  const visitedByCode = useMemo(() => {
    const map = new Map<string, VisitedCountry>();
    for (const c of visitedCountries) {
      map.set(c.country_code.toUpperCase(), c);
    }
    return map;
  }, [visitedCountries]);

  const wishlistByCode = useMemo(() => {
    const map = new Map<string, WishlistCountry>();
    for (const c of wishlistCountries) {
      map.set(c.country_code.toUpperCase(), c);
    }
    return map;
  }, [wishlistCountries]);

  const visitedCodeSet = useMemo(
    () => new Set(visitedCountryCodes.map((c) => c.toUpperCase())),
    [visitedCountryCodes]
  );

  const existingCityNamesForPicker = useMemo(() => {
    if (!cityPickerTarget) return [];
    const code = cityPickerTarget.code.toUpperCase();
    return visitedCities
      .filter((city) => city.country_code.toUpperCase() === code)
      .map((city) => city.city_name);
  }, [cityPickerTarget, visitedCities]);

  const rows = useMemo((): CountryRow[] => {
    const q = query.trim().toLowerCase();

    const source = q
      ? searchCountries(query)
      : COUNTRY_LIST.filter(
          (c) =>
            visitedCodeSet.has(c.code) || wishlistByCode.has(c.code)
        );

    return source.map((c) => {
      const visited = visitedByCode.get(c.code);
      const wishlist = wishlistByCode.get(c.code);
      const isVisited = visitedCodeSet.has(c.code);

      return {
        code: c.code,
        name: c.name,
        visitedId: visited?.id,
        wishlistId: wishlist?.id,
        isVisited,
        visitedViaPlacesOnly: isVisited && !visited,
        isWishlist: wishlistByCode.has(c.code),
      };
    });
  }, [query, visitedByCode, wishlistByCode, visitedCodeSet]);

  async function addVisited(code: string) {
    const result = await addVisitedCountry(code);
    if (!result.ok) {
      await modal.alert(result.error, { variant: "error" });
      return false;
    }
    return true;
  }

  async function removeVisited(row: CountryRow) {
    if (
      row.visitedViaPlacesOnly ||
      countryHasMappedPlaces(row.code, visitedCities, visitedParks)
    ) {
      toast.show(countryMessages.removePlacesFirst);
      return false;
    }
    if (!row.visitedId) return false;

    const res = await fetch(`/api/countries/${row.visitedId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      if (isCountryRemoveBlockedByPlacesError(data.error)) {
        toast.show(countryMessages.removePlacesFirst);
        return false;
      }
      await modal.alert(data.error ?? "Failed to remove country", { variant: "error" });
      return false;
    }
    return true;
  }

  async function addWishlist(code: string) {
    const res = await fetch("/api/wishlist/countries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country_code: code,
        country_name: getCountryName(code),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      await modal.alert(data.error ?? "Failed to add to wishlist", { variant: "error" });
      return false;
    }
    return true;
  }

  async function removeWishlist(row: CountryRow) {
    if (!row.wishlistId) return false;

    const res = await fetch(`/api/wishlist/countries/${row.wishlistId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      await modal.alert(data.error ?? "Failed to remove from wishlist", { variant: "error" });
      return false;
    }
    return true;
  }

  async function handleVisitedToggle(row: CountryRow, checked: boolean) {
    if (busyCode) return;
    setBusyCode(row.code);

    try {
      const ok = checked ? await addVisited(row.code) : await removeVisited(row);
      if (ok) {
        if (checked) {
          setCityPickerTarget({ code: row.code, name: row.name });
        }
        router.refresh();
      }
    } finally {
      setBusyCode(null);
    }
  }

  async function handleWishlistToggle(row: CountryRow, checked: boolean) {
    if (busyCode || row.isVisited) return;
    setBusyCode(row.code);

    try {
      const ok = checked ? await addWishlist(row.code) : await removeWishlist(row);
      if (ok) router.refresh();
    } finally {
      setBusyCode(null);
    }
  }

  const showIdle = query.trim().length === 0 && rows.length === 0;

  return (
    <section
      className={
        embedded
          ? "profile-owner-edit-surface flex min-w-0 max-w-full flex-col gap-4"
          : "flex min-w-0 max-w-full flex-col gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5"
      }
    >
      {!embedded ? (
        <div>
          <h2 className="text-lg font-semibold text-white">{countryMessages.title}</h2>
          <p className="mt-1 text-xs text-slate-500">{countryMessages.toggleHint}</p>
        </div>
      ) : null}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={countryMessages.searchPlaceholder}
        className={
          embedded
            ? "profile-owner-input w-full"
            : "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
        }
        autoComplete="off"
      />

      <div
        className={
          embedded
            ? "profile-owner-table overflow-hidden rounded-xl"
            : "overflow-hidden rounded-lg border border-slate-700 bg-slate-950"
        }
      >
        <div className={`grid grid-cols-[minmax(0,1fr)_3.25rem_3.25rem] gap-2 border-b px-2 py-2 text-xs font-medium uppercase tracking-wide sm:grid-cols-[minmax(0,1fr)_5rem_5rem] sm:px-3${embedded ? " border-[#e8eef5] text-[#6b7f96]" : " border-slate-800 text-slate-500"}`}>
          <span>{countryMessages.name}</span>
          <span className="text-center text-blue-400">{countryMessages.columnVisited}</span>
          <span className="text-center text-amber-400">{countryMessages.columnWant}</span>
        </div>

        <ul className="max-h-72 overflow-y-auto scrollbar-thin">
          {showIdle ? (
            <li className={`px-3 py-6 text-center text-sm${embedded ? " text-[#6b7f96]" : " text-slate-500"}`}>
              {countryMessages.searchIdle}
            </li>
          ) : rows.length === 0 ? (
            <li className={`px-3 py-6 text-center text-sm${embedded ? " text-[#6b7f96]" : " text-slate-500"}`}>
              {countryMessages.noResults}
            </li>
          ) : (
            rows.map((row) => {
              const loading = busyCode === row.code;

              return (
                <li
                  key={row.code}
                  className={`grid grid-cols-[minmax(0,1fr)_3.25rem_3.25rem] items-center gap-2 border-b px-2 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_5rem_5rem] sm:px-3${embedded ? " border-[#eef2f7]" : " border-slate-800/80"}`}
                >
                  <div className="min-w-0">
                    <p className={`truncate text-sm${embedded ? " text-[var(--profile-text)]" : " text-slate-200"}`}>{row.name}</p>
                    <p className={`text-xs${embedded ? " text-[#94a3b8]" : " text-slate-600"}`}>{row.code}</p>
                  </div>

                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={row.isVisited}
                      disabled={loading || (row.isVisited && row.visitedViaPlacesOnly)}
                      title={row.visitedViaPlacesOnly ? countryMessages.lockedViaPlaces : undefined}
                      onChange={(e) => handleVisitedToggle(row, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/40 disabled:opacity-60"
                      aria-label={`${countryMessages.columnVisited}: ${row.name}`}
                    />
                  </div>

                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={row.isWishlist && !row.isVisited}
                      disabled={loading || row.isVisited}
                      onChange={(e) => handleWishlistToggle(row, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500/40 disabled:opacity-40"
                      aria-label={`${wishlistMessages.columnWant}: ${row.name}`}
                    />
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {cityPickerTarget && (
        <CountryCityPickerSheet
          countryCode={cityPickerTarget.code}
          countryName={cityPickerTarget.name}
          existingCityNames={existingCityNamesForPicker}
          onAdded={() => {
            setCityPickerTarget(null);
            router.refresh();
          }}
          onClose={() => setCityPickerTarget(null)}
        />
      )}
    </section>
  );
}
