"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppMessages } from "@/lib/i18n/client-messages";
import { getIntlLocale } from "@/lib/i18n/config";

type VisitMonthYearSelectProps = {
  value: string | null;
  onChange: (yearMonth: string | null) => void;
};

function currentYearMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function parseYearMonth(value: string | null): { month: string; year: string } {
  if (!value) return { month: "", year: "" };
  const [year, month] = value.split("-");
  return { month: month ?? "", year: year ?? "" };
}

export function VisitMonthYearSelect({ value, onChange }: VisitMonthYearSelectProps) {
  const { city: cityMessages } = useAppMessages();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const maxYearMonth = currentYearMonth();
  const [maxYear] = maxYearMonth.split("-");

  const initial = parseYearMonth(value);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  useEffect(() => {
    const parsed = parseYearMonth(value);
    setMonth(parsed.month);
    setYear(parsed.year);
  }, [value]);

  const intlLocale = getIntlLocale();

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const monthValue = String(index + 1).padStart(2, "0");
        const label = new Intl.DateTimeFormat(intlLocale, { month: "long" }).format(
          new Date(2024, index, 1)
        );
        const capitalized = label.charAt(0).toLocaleUpperCase(intlLocale) + label.slice(1);
        return { value: monthValue, label: capitalized };
      }),
    [intlLocale]
  );

  const yearOptions = useMemo(() => {
    const end = Number(maxYear);
    const start = end - 80;
    const years: number[] = [];
    for (let y = end; y >= start; y -= 1) {
      years.push(y);
    }
    return years;
  }, [maxYear]);

  function commit(nextMonth: string, nextYear: string) {
    if (!nextMonth || !nextYear) {
      if (value !== null) {
        onChangeRef.current(null);
      }
      return;
    }

    const candidate = `${nextYear}-${nextMonth}`;
    const resolved = candidate > maxYearMonth ? maxYearMonth : candidate;
    if (resolved !== value) {
      onChangeRef.current(resolved);
    }
  }

  function handleMonthChange(nextMonth: string) {
    setMonth(nextMonth);
    commit(nextMonth, year);
  }

  function handleYearChange(nextYear: string) {
    setYear(nextYear);
    commit(month, nextYear);
  }

  const selectClass =
    "min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-white outline-none focus:border-blue-500";

  return (
    <div className="flex min-w-0 flex-1 gap-2">
      <select
        value={month}
        onChange={(event) => handleMonthChange(event.target.value)}
        className={selectClass}
        aria-label={cityMessages.visitMonthLabel}
      >
        <option value="">{cityMessages.visitMonthPlaceholder}</option>
        {monthOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(event) => handleYearChange(event.target.value)}
        className={`${selectClass} max-w-[8.5rem]`}
        aria-label={cityMessages.visitYearLabel}
      >
        <option value="">{cityMessages.visitYearPlaceholder}</option>
        {yearOptions.map((optionYear) => (
          <option key={optionYear} value={String(optionYear)}>
            {optionYear}
          </option>
        ))}
      </select>
    </div>
  );
}
