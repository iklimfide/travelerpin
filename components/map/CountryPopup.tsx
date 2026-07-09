"use client";

import { useEffect } from "react";
import { CountryCityPicker } from "@/components/map/CountryCityPicker";
import { CountryParkPicker } from "@/components/map/CountryParkPicker";
import { countryMessages, mapMessages } from "@/lib/i18n/client-messages";

type CountryPopupProps = {
  countryName: string;
  countryCode: string;
  isVisited: boolean;
  isWishlist: boolean;
  visitedViaPlacesOnly?: boolean;
  busy?: boolean;
  showCityPicker?: boolean;
  existingCityNames?: string[];
  existingParkKeys?: string[];
  onVisitedChange: (checked: boolean) => void;
  onWishlistChange: (checked: boolean) => void;
  onCitiesAdded: () => void;
  onParksAdded?: () => void;
  onClose: () => void;
  cityPickerFirst?: boolean;
  readOnly?: boolean;
};

export function CountryPopup({
  countryName,
  countryCode,
  isVisited,
  isWishlist,
  visitedViaPlacesOnly = false,
  busy = false,
  showCityPicker = false,
  existingCityNames = [],
  existingParkKeys = [],
  onVisitedChange,
  onWishlistChange,
  onCitiesAdded,
  onParksAdded,
  onClose,
  cityPickerFirst = false,
  readOnly = false,
}: CountryPopupProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="country-popup-title"
    >
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl ${
          showCityPicker ? "max-h-[90vh] max-w-md" : "max-w-sm"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2
              id="country-popup-title"
              className="truncate text-xl font-semibold text-white"
              title={countryName}
            >
              {countryName}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">{countryCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label={mapMessages.close}
          >
            ✕
          </button>
        </div>

        {cityPickerFirst && showCityPicker ? (
          <>
            <CountryCityPicker
              countryCode={countryCode}
              countryName={countryName}
              existingCityNames={existingCityNames}
              onAdded={onCitiesAdded}
            />
            <CountryParkPicker
              countryCode={countryCode}
              countryName={countryName}
              existingParkKeys={existingParkKeys}
              onAdded={onParksAdded ?? onCitiesAdded}
            />
          </>
        ) : readOnly ? (
          <div className="flex flex-col gap-2 px-5 py-4">
            {isVisited ? (
              <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-300">
                {countryMessages.columnVisited}
              </p>
            ) : null}
            {isWishlist && !isVisited ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-300">
                {countryMessages.columnWant}
              </p>
            ) : null}
            {!isVisited && !isWishlist ? (
              <p className="text-sm text-slate-500">{mapMessages.countryEmpty}</p>
            ) : null}
          </div>
        ) : (
          <>
        <div className="flex flex-col gap-3 px-5 py-4">
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 transition-colors hover:border-blue-500/40 ${
              busy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={isVisited}
              disabled={busy || (isVisited && visitedViaPlacesOnly)}
              title={visitedViaPlacesOnly ? countryMessages.lockedViaPlaces : undefined}
              onChange={(e) => onVisitedChange(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/40 disabled:opacity-60"
            />
            <span className="text-sm font-medium text-blue-400">{countryMessages.columnVisited}</span>
          </label>

          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 transition-colors hover:border-amber-500/40 ${
              busy || isVisited ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={isWishlist && !isVisited}
              disabled={busy || isVisited}
              onChange={(e) => onWishlistChange(e.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500/40 disabled:opacity-40"
            />
            <span className="text-sm font-medium text-amber-400">{countryMessages.columnWant}</span>
          </label>
        </div>

        {showCityPicker && (
          <>
            <CountryCityPicker
              countryCode={countryCode}
              countryName={countryName}
              existingCityNames={existingCityNames}
              onAdded={onCitiesAdded}
            />
            <CountryParkPicker
              countryCode={countryCode}
              countryName={countryName}
              existingParkKeys={existingParkKeys}
              onAdded={onParksAdded ?? onCitiesAdded}
            />
          </>
        )}
          </>
        )}
      </div>
    </div>
  );
}
