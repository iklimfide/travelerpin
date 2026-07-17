"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COUNTRY_LIST, rankCountriesForSearch } from "@/lib/data/countries";

/** TR first, then the rest in alphabetical order. */
const YP_COUNTRY_LIST = [
  ...COUNTRY_LIST.filter((c) => c.code === "TR"),
  ...COUNTRY_LIST.filter((c) => c.code !== "TR"),
];

type YpCountrySelectProps = {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
  emptyLabel?: string;
  /** Append "(TR)" style codes in the list (manage filter). */
  showCode?: boolean;
};

type PopoverPos = {
  top: number;
  left: number;
  width: number;
};

export function YpCountrySelect({
  id,
  value,
  onChange,
  required = false,
  emptyLabel = "Ülke seç",
  showCode = false,
}: YpCountrySelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const [mounted, setMounted] = useState(false);

  const selected = useMemo(
    () => YP_COUNTRY_LIST.find((c) => c.code === value) ?? null,
    [value]
  );

  const filtered = useMemo(() => {
    const q = filter.trim();
    if (!q) return YP_COUNTRY_LIST;
    return rankCountriesForSearch(YP_COUNTRY_LIST, q);
  }, [filter]);

  useEffect(() => {
    setMounted(true);
  }, []);

  function updatePosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    setPos({
      top: rect.bottom + 4,
      left: Math.max(8, left),
      width,
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePosition();
    function onReposition() {
      updatePosition();
    }
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
      setFilter("");
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setFilter("");
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  function labelFor(code: string, name: string) {
    return showCode ? `${name} (${code})` : name;
  }

  function closeAndSelect(code: string) {
    onChange(code);
    setOpen(false);
    setFilter("");
  }

  const triggerLabel = selected
    ? labelFor(selected.code, selected.name)
    : emptyLabel;

  const popover =
    open && mounted && pos
      ? createPortal(
          <div
            ref={popoverRef}
            className="yp-country-select__popover"
            role="presentation"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 80,
            }}
          >
            <div className="yp-country-select__search">
              <input
                ref={searchRef}
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const first = filtered[0];
                    if (first) closeAndSelect(first.code);
                  }
                }}
                placeholder="Ülke ara…"
                autoComplete="off"
                aria-label="Ülke ara"
              />
            </div>
            <ul className="yp-country-select__list" role="listbox" aria-labelledby={fieldId}>
              {!required ? (
                <li role="option" aria-selected={!value}>
                  <button
                    type="button"
                    className={`yp-country-select__option${!value ? " is-active" : ""}`}
                    onClick={() => closeAndSelect("")}
                  >
                    {emptyLabel}
                  </button>
                </li>
              ) : null}
              {filtered.length === 0 ? (
                <li className="yp-country-select__empty">Sonuç yok</li>
              ) : (
                filtered.map((country) => {
                  const active = country.code === value;
                  return (
                    <li key={country.code} role="option" aria-selected={active}>
                      <button
                        type="button"
                        className={`yp-country-select__option${active ? " is-active" : ""}`}
                        onClick={() => closeAndSelect(country.code)}
                      >
                        {labelFor(country.code, country.name)}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`yp-country-select${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        className="yp-country-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required || undefined}
        onClick={() => {
          setOpen((current) => !current);
          setFilter("");
        }}
      >
        <span className={!selected ? "yp-country-select__placeholder" : undefined}>
          {triggerLabel}
        </span>
        <span className="yp-country-select__chevron" aria-hidden>
          ▾
        </span>
      </button>
      {popover}
    </div>
  );
}
