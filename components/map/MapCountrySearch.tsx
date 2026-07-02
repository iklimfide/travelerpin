"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchCountries, type CountryOption } from "@/lib/data/countries";
import { mapMessages } from "@/lib/i18n/client-messages";

type MapCountrySearchProps = {
  onSelect: (country: CountryOption) => void;
};

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 8;

export function MapCountrySearch({ onSelect }: MapCountrySearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < MIN_QUERY_LENGTH) return [];
    return searchCountries(query, MAX_RESULTS);
  }, [query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function pickCountry(country: CountryOption) {
    onSelect(country);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="sr-only" htmlFor="map-country-search">
        {mapMessages.searchCountryLabel}
      </label>
      <input
        id="map-country-search"
        type="search"
        value={query}
        placeholder={mapMessages.searchCountry}
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full rounded-lg border border-slate-600/80 bg-slate-900/95 px-3 py-2 text-sm text-slate-100 shadow-lg backdrop-blur-sm outline-none transition-colors placeholder:text-slate-400 hover:border-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />

      {open && query.trim().length >= MIN_QUERY_LENGTH && (
        <ul
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-600/80 bg-slate-900/98 py-1 shadow-xl backdrop-blur-sm"
          role="listbox"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">
              {mapMessages.searchCountryNoResults}
            </li>
          ) : (
            results.map((country) => (
              <li key={country.code}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                  onClick={() => pickCountry(country)}
                >
                  <span className="truncate">{country.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">{country.code}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
