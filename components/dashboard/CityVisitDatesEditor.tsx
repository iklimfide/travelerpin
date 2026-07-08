"use client";

import { useState } from "react";
import { VisitMonthYearSelect } from "@/components/dashboard/VisitMonthYearSelect";
import { VisitYearsMultiSelect } from "@/components/dashboard/VisitYearsMultiSelect";
import { LIMITS } from "@/lib/constants";
import { cityMessages, formatMessage } from "@/lib/i18n/client-messages";
import { formatVisitMonthYear, normalizeVisitDates } from "@/lib/utils/visit-date";

type CityVisitDatesEditorProps = {
  value: string[];
  onChange: (dates: string[]) => void;
  hideHint?: boolean;
};

function CityVisitDatesMonthEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (dates: string[]) => void;
}) {
  const [slots, setSlots] = useState<(string | null)[]>(() =>
    value.length > 0 ? [...value] : [null]
  );

  function emit(nextSlots: (string | null)[]) {
    const visible = nextSlots.length > 0 ? nextSlots : [null];
    setSlots(visible);
    onChange(
      normalizeVisitDates(
        visible.filter((slot): slot is string => Boolean(slot))
      )
    );
  }

  function updateSlot(index: number, yearMonth: string | null) {
    const next = [...slots];
    next[index] = yearMonth;
    emit(next);
  }

  function removeSlot(index: number) {
    const next = slots.filter((_, i) => i !== index);
    emit(next.length > 0 ? next : [null]);
  }

  function addAnotherVisit() {
    emit([...slots, null]);
  }

  function slotLabel(index: number): string {
    return index === 0
      ? cityMessages.visitDateFirst
      : formatMessage(cityMessages.visitDateNth, { n: index + 1 });
  }

  const canAddAnother = slots.length < LIMITS.maxCityVisitDates;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-blue-500/25 bg-blue-500/5 px-3 py-3">
      <div>
        <p className="dashboard-form-city__label mb-0">{cityMessages.visitDatesTitle}</p>
        <p className="mt-1 text-xs text-slate-500">{cityMessages.visitDatesHint}</p>
      </div>

      {slots.map((slot, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <label className="text-sm text-slate-400">{slotLabel(index)}</label>
          <div className="flex min-w-0 items-center gap-2">
            <VisitMonthYearSelect
              value={slot}
              onChange={(yearMonth) => updateSlot(index, yearMonth)}
            />
            {slot ? (
              <span className="hidden shrink-0 text-sm text-slate-400 sm:inline">
                {formatVisitMonthYear(slot)}
              </span>
            ) : (
              <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">
                {cityMessages.visitDateOptional}
              </span>
            )}
            {slots.length > 1 || slot ? (
              <button
                type="button"
                onClick={() => removeSlot(index)}
                className="shrink-0 px-1 text-lg leading-none text-slate-500 hover:text-red-400"
                aria-label={cityMessages.visitDateRemove}
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      ))}

      {canAddAnother ? (
        <button
          type="button"
          onClick={addAnotherVisit}
          className="self-start text-sm font-medium text-blue-400 hover:text-blue-300"
        >
          + {cityMessages.visitAgain}
        </button>
      ) : null}
    </div>
  );
}

export function CityVisitDatesEditor({ value, onChange, hideHint = false }: CityVisitDatesEditorProps) {
  if (hideHint) {
    return <VisitYearsMultiSelect value={value} onChange={onChange} />;
  }

  return <CityVisitDatesMonthEditor value={value} onChange={onChange} />;
}
