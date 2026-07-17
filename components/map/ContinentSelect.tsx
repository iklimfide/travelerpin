"use client";

import { CONTINENT_IDS, type ContinentId } from "@/lib/map/continents";
import { useAppMessages } from "@/lib/i18n/client-messages";

type ContinentSelectProps = {
  value: ContinentId;
  onChange: (continent: ContinentId) => void;
};

export function ContinentSelect({ value, onChange }: ContinentSelectProps) {
  const { map: mapMessages } = useAppMessages();
  return (
    <>
      <label className="sr-only" htmlFor="continent-select">
        {mapMessages.continentLabel}
      </label>
      <select
        id="continent-select"
        value={value}
        onChange={(event) => onChange(event.target.value as ContinentId)}
        className="w-full rounded-lg border border-slate-600/80 bg-slate-900/95 px-3 py-2 text-sm text-slate-100 shadow-lg backdrop-blur-sm outline-none transition-colors hover:border-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        {CONTINENT_IDS.map((id) => (
          <option key={id} value={id}>
            {mapMessages.continents[id]}
          </option>
        ))}
      </select>
    </>
  );
}
