"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useModal } from "@/components/ui/ModalProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { formatMessage, useAppMessages } from "@/lib/i18n/client-messages";
import { CountryCityPickerSheet } from "@/components/map/CountryCityPickerSheet";
import { ProfileCountryLink } from "@/components/profile/ProfilePlaceLink";
import { getCountryList, searchCountries } from "@/lib/data/countries";
import { resolveCountryHubSlug } from "@/lib/data/country-hubs";
import { addVisitedCountry, addWishlistCountry, removeVisitedCountry, removeWishlistCountry } from "@/lib/client/country-actions";
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
  /** Opens My Cities edit for this country when remove is blocked by places. */
  onEditCountryCities?: (countryCode: string, countryName: string) => void;
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

type RowOverride = {
  isVisited?: boolean;
  isWishlist?: boolean;
  visitedId?: string | null;
  wishlistId?: string | null;
};

export function CountryManager({
  visitedCountries,
  wishlistCountries,
  visitedCountryCodes,
  visitedCities,
  visitedParks = [],
  embedded = false,
  onEditCountryCities,
}: CountryManagerProps) {
  const { country: countryMessages, wishlist: wishlistMessages, modal: modalMessages } = useAppMessages();
  const modal = useModal();
  const toast = useToast();
  const locale = useLocale() === "tr" ? "tr" : "en";
  const [query, setQuery] = useState("");
  const [rowOverrides, setRowOverrides] = useState<Record<string, RowOverride>>({});
  const [cityPickerTarget, setCityPickerTarget] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const visitedAddTokens = useRef<Record<string, number>>({});
  const wishlistAddTokens = useRef<Record<string, number>>({});

  useEffect(() => {
    setRowOverrides({});
  }, [visitedCountries, wishlistCountries, visitedCountryCodes]);

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

  const baseRows = useMemo((): CountryRow[] => {
    const q = query.trim().toLowerCase();
    const countryList = getCountryList(locale);

    const source = q
      ? searchCountries(query, 12, locale)
      : countryList.filter(
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
  }, [query, visitedByCode, wishlistByCode, visitedCodeSet, locale]);

  const rows = useMemo((): CountryRow[] => {
    return baseRows.map((row) => {
      const override = rowOverrides[row.code];
      if (!override) return row;

      const isVisited = override.isVisited ?? row.isVisited;
      const isWishlist = override.isWishlist ?? row.isWishlist;

      return {
        ...row,
        isVisited,
        isWishlist: isWishlist && !isVisited,
        visitedId:
          override.visitedId !== undefined ? (override.visitedId ?? undefined) : row.visitedId,
        wishlistId:
          override.wishlistId !== undefined ? (override.wishlistId ?? undefined) : row.wishlistId,
      };
    });
  }, [baseRows, rowOverrides]);

  function patchRow(code: string, patch: RowOverride) {
    setRowOverrides((current) => ({
      ...current,
      [code]: { ...current[code], ...patch },
    }));
  }

  function clearRowOverride(code: string) {
    setRowOverrides((current) => {
      if (!(code in current)) return current;
      const next = { ...current };
      delete next[code];
      return next;
    });
  }

  function showRemovePlacesFirst(row: CountryRow) {
    if (onEditCountryCities) {
      toast.showAction({
        message: countryMessages.removePlacesFirst,
        actionLabel: formatMessage(countryMessages.editCitiesInCountry, { name: row.name }),
        dismissLabel: modalMessages.ok,
        accent: "blue",
        onAction: () => onEditCountryCities(row.code, row.name),
      });
      return;
    }
    toast.show(countryMessages.removePlacesFirst);
  }

  function handleVisitedToggle(row: CountryRow, checked: boolean) {
    if (checked) {
      const token = (visitedAddTokens.current[row.code] ?? 0) + 1;
      visitedAddTokens.current[row.code] = token;

      patchRow(row.code, {
        isVisited: true,
        isWishlist: false,
        wishlistId: null,
      });
      setCityPickerTarget({ code: row.code, name: row.name });

      void addVisitedCountry(row.code).then(async (result) => {
        if (token !== visitedAddTokens.current[row.code]) {
          if (result.ok) void removeVisitedCountry(result.id);
          return;
        }

        if (!result.ok) {
          clearRowOverride(row.code);
          await modal.alert(result.error, { variant: "error" });
          return;
        }

        patchRow(row.code, { visitedId: result.id });
      });
      return;
    }

    if (
      row.visitedViaPlacesOnly ||
      countryHasMappedPlaces(row.code, visitedCities, visitedParks)
    ) {
      showRemovePlacesFirst(row);
      return;
    }

    if (!row.visitedId) {
      visitedAddTokens.current[row.code] = (visitedAddTokens.current[row.code] ?? 0) + 1;
      patchRow(row.code, { isVisited: false, visitedId: null });
      return;
    }

    const prevId = row.visitedId;
    patchRow(row.code, { isVisited: false, visitedId: null });

    void removeVisitedCountry(prevId).then(async (result) => {
      if (!result.ok) {
        clearRowOverride(row.code);
        if (isCountryRemoveBlockedByPlacesError(result.error)) {
          showRemovePlacesFirst(row);
          return;
        }
        await modal.alert(result.error, { variant: "error" });
        return;
      }
    });
  }

  function handleWishlistToggle(row: CountryRow, checked: boolean) {
    if (row.isVisited) return;

    if (checked) {
      const token = (wishlistAddTokens.current[row.code] ?? 0) + 1;
      wishlistAddTokens.current[row.code] = token;

      patchRow(row.code, { isWishlist: true });

      void addWishlistCountry(row.code).then(async (result) => {
        if (token !== wishlistAddTokens.current[row.code]) {
          if (result.ok) void removeWishlistCountry(result.id);
          return;
        }

        if (!result.ok) {
          clearRowOverride(row.code);
          await modal.alert(result.error, { variant: "error" });
          return;
        }

        patchRow(row.code, { wishlistId: result.id });
      });
      return;
    }

    if (!row.wishlistId) {
      wishlistAddTokens.current[row.code] = (wishlistAddTokens.current[row.code] ?? 0) + 1;
      patchRow(row.code, { isWishlist: false, wishlistId: null });
      return;
    }

    const prevId = row.wishlistId;
    patchRow(row.code, { isWishlist: false, wishlistId: null });

    void removeWishlistCountry(prevId).then(async (result) => {
      if (!result.ok) {
        clearRowOverride(row.code);
        await modal.alert(result.error, { variant: "error" });
        return;
      }
    });
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
            rows.map((row) => (
              <li
                key={row.code}
                className={`grid grid-cols-[minmax(0,1fr)_3.25rem_3.25rem] items-center gap-2 border-b px-2 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_5rem_5rem] sm:px-3${embedded ? " border-[#eef2f7]" : " border-slate-800/80"}`}
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm${embedded ? " text-[var(--profile-text)]" : " text-slate-200"}`}
                    title={row.name}
                  >
                    <ProfileCountryLink
                      slug={resolveCountryHubSlug(row.code, row.name)}
                      name={row.name}
                      className={embedded ? "profile-owner-hub-link" : "profile-owner-hub-link text-slate-200"}
                      title={row.name}
                    />
                  </p>
                  <p className={`text-xs${embedded ? " text-[#94a3b8]" : " text-slate-600"}`}>{row.code}</p>
                </div>

                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={row.isVisited}
                    disabled={row.isVisited && row.visitedViaPlacesOnly}
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
                    disabled={row.isVisited}
                    onChange={(e) => handleWishlistToggle(row, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500/40 disabled:opacity-40"
                    aria-label={`${wishlistMessages.columnWant}: ${row.name}`}
                  />
                </div>
              </li>
            ))
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
          }}
          onClose={() => setCityPickerTarget(null)}
        />
      )}
    </section>
  );
}
