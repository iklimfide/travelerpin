"use client";

import { CountryCityPicker } from "@/components/map/CountryCityPicker";
import { useAppMessages } from "@/lib/i18n/client-messages";

type CountryCityPickerSheetProps = {
  countryCode: string;
  countryName: string;
  existingCityNames: string[];
  onAdded: () => void;
  onClose: () => void;
};

export function CountryCityPickerSheet({
  countryCode,
  countryName,
  existingCityNames,
  onAdded,
  onClose,
}: CountryCityPickerSheetProps) {
  const { map: mapMessages } = useAppMessages();
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-picker-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <h2 id="city-picker-title" className="text-xl font-semibold text-white">
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
        <CountryCityPicker
          countryCode={countryCode}
          countryName={countryName}
          existingCityNames={existingCityNames}
          onAdded={onAdded}
        />
      </div>
    </div>
  );
}
