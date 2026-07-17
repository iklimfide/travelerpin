"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LIMITS } from "@/lib/constants";
import { cityMessages, formatMessage, useAppMessages } from "@/lib/i18n/client-messages";
import {
  extractVisitYears,
  yearsToVisitYearMonths,
} from "@/lib/utils/visit-date";

type VisitYearsMultiSelectProps = {
  value: string[];
  onChange: (dates: string[]) => void;
};

const YEAR_SPAN = 80;

function buildYearOptions(endYear: number): number[] {
  const years: number[] = [];
  for (let year = endYear; year >= endYear - YEAR_SPAN; year -= 1) {
    years.push(year);
  }
  return years;
}

function formatTriggerLabel(selectedYears: number[]): string {
  if (selectedYears.length === 0) return cityMessages.visitDatesTitle;
  if (selectedYears.length <= 3) {
    return `${cityMessages.visitDatesTitle}: ${selectedYears.join(", ")}`;
  }
  return formatMessage(cityMessages.visitYearsSelected, { count: selectedYears.length });
}

export function VisitYearsMultiSelect({ value, onChange }: VisitYearsMultiSelectProps) {
  const { city: cityMessages } = useAppMessages();
  const [open, setOpen] = useState(false);
  const [draftYears, setDraftYears] = useState<number[]>(() => extractVisitYears(value));
  const rootRef = useRef<HTMLDivElement>(null);

  const endYear = new Date().getFullYear();
  const yearOptions = useMemo(() => buildYearOptions(endYear), [endYear]);
  const selectedYears = extractVisitYears(value);

  useEffect(() => {
    if (!open) {
      setDraftYears(extractVisitYears(value));
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  function toggleYear(year: number) {
    setDraftYears((previous) => {
      if (previous.includes(year)) {
        return previous.filter((item) => item !== year);
      }
      if (previous.length >= LIMITS.maxCityVisitDates) return previous;
      return [...previous, year].sort((a, b) => b - a);
    });
  }

  function apply() {
    onChange(yearsToVisitYearMonths(draftYears));
    setOpen(false);
  }

  return (
    <div className="visit-years-picker" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="visit-years-picker__trigger pin-form-actions__btn pin-form-actions__btn--primary"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {formatTriggerLabel(selectedYears)}
      </button>

      {open ? (
        <div
          className="visit-years-picker__panel"
          role="dialog"
          aria-modal="false"
          aria-label={cityMessages.visitDatesTitle}
        >
          <ul className="visit-years-picker__list scrollbar-thin">
            {yearOptions.map((year) => {
              const checked = draftYears.includes(year);
              const disabled = !checked && draftYears.length >= LIMITS.maxCityVisitDates;

              return (
                <li key={year}>
                  <label
                    className={`visit-years-picker__option${
                      disabled ? " visit-years-picker__option--disabled" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleYear(year)}
                    />
                    <span>{year}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <button type="button" className="visit-years-picker__done" onClick={apply}>
            {cityMessages.visitYearsDone}
          </button>
        </div>
      ) : null}
    </div>
  );
}
