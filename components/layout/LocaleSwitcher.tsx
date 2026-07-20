"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "next-intl";
import {
  activeLocales,
  defaultLocale,
  getLocaleLabel,
  type Locale,
} from "@/lib/i18n/config";
import { usePathname } from "@/lib/i18n/navigation";
import { isPublicProfilePath, stripLocalePrefix } from "@/lib/i18n/pathname";
import { getOwnUsername } from "@/lib/client/session-page-cache";

type Props = {
  className?: string;
  /** Accessible name / visible label for the control. */
  label?: string;
  /** Optional hint under the settings variant title. */
  hint?: string;
  /** `footer` = inline text links; `topBar` = compact dropdown; `menu` = profile menu row; `settings` = settings page section. */
  variant?: "footer" | "topBar" | "menu" | "settings";
  /** Called after a locale change is triggered (e.g. close parent menu). */
  onSwitch?: () => void;
};

function localeCode(code: Locale): string {
  return code.toUpperCase();
}

/** Build a locale-prefixed URL (EN has no prefix; profiles stay unprefixed). */
function hrefForLocale(pathname: string, code: Locale): string {
  const path = stripLocalePrefix(pathname);
  if (isPublicProfilePath(path)) return path;
  if (code === defaultLocale) return path;
  return path === "/" ? `/${code}` : `/${code}${path}`;
}

/**
 * Soft `router.replace(..., { locale })` is unreliable here: Next.js
 * `experimental.staleTimes` (24h) can keep the previous locale RSC shell and
 * never change the URL. Full navigation always loads the correct `[locale]` tree.
 */
function navigateToLocale(pathname: string, code: Locale) {
  document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=lax`;
  window.location.assign(hrefForLocale(pathname, code));
}

/** Persist owner share-preview locale when signed in (best-effort). */
async function persistProfileLocale(code: Locale): Promise<void> {
  // Guests always 401 — skip the Fluid Function invocation entirely.
  if (!getOwnUsername()) return;
  try {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: code }),
      keepalive: true,
    });
  } catch {
    // Offline — UI cookie still applies for browsing.
  }
}

function LanguageIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.8 3.8 6 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-6-3.8-9s1.3-6.2 3.8-9Z" />
    </svg>
  );
}

/**
 * Switches locale while preserving the current pathname.
 * First-visit Accept-Language redirects are handled by next-intl middleware
 * (`localeDetection` in `lib/i18n/routing.ts`).
 */
export function LocaleSwitcher({
  className,
  label = "Language",
  hint,
  variant = "footer",
  onSwitch,
}: Props) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Seed profiles.locale from the current UI locale once per session so
  // existing TR users get TR Open Graph without having to switch again.
  useEffect(() => {
    const key = `tp:locale-synced:${locale}`;
    try {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode — still attempt once this mount.
    }
    void persistProfileLocale(locale);
  }, [locale]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function switchTo(code: Locale) {
    if (code === locale) {
      setOpen(false);
      onSwitch?.();
      return;
    }
    setOpen(false);
    onSwitch?.();
    void persistProfileLocale(code).finally(() => {
      navigateToLocale(pathname, code);
    });
  }

  if (variant === "topBar") {
    return (
      <div
        ref={rootRef}
        className={`dashboard-locale-switcher${className ? ` ${className}` : ""}`}
      >
        <button
          type="button"
          className={`dashboard-locale-switcher__trigger${
            open ? " dashboard-locale-switcher__trigger--open" : ""
          }`}
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="dashboard-locale-switcher__code">{localeCode(locale)}</span>
          <svg
            className="dashboard-locale-switcher__chevron"
            viewBox="0 0 12 12"
            width={10}
            height={10}
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open ? (
          <div
            id={menuId}
            role="menu"
            aria-label={label}
            className="dashboard-locale-switcher__menu"
          >
            {activeLocales.map((code) => {
              const isActive = code === locale;
              return (
                <button
                  key={code}
                  type="button"
                  role="menuitem"
                  aria-current={isActive ? "true" : undefined}
                  className={`dashboard-locale-switcher__option${
                    isActive ? " dashboard-locale-switcher__option--active" : ""
                  }`}
                  onClick={() => switchTo(code)}
                >
                  <span className="dashboard-locale-switcher__option-code">
                    {localeCode(code)}
                  </span>
                  <span className="dashboard-locale-switcher__option-label">
                    {getLocaleLabel(code)}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  if (variant === "menu") {
    return (
      <div
        className={`dashboard-profile-menu__locale${className ? ` ${className}` : ""}`}
        role="group"
        aria-label={label}
      >
        <span className="dashboard-profile-menu__locale-label">
          <span className="dashboard-profile-menu__icon" aria-hidden>
            <LanguageIcon />
          </span>
          {label}
        </span>
        <div className="dashboard-profile-menu__locale-options">
          {activeLocales.map((code) => {
            const isActive = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={`dashboard-profile-menu__locale-option${
                  isActive ? " dashboard-profile-menu__locale-option--active" : ""
                }`}
                onClick={() => switchTo(code)}
              >
                {localeCode(code)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === "settings") {
    return (
      <div
        className={className}
        role="group"
        aria-label={label}
      >
        <div className="flex flex-wrap gap-2">
          {activeLocales.map((code) => {
            const isActive = code === locale;
            return (
              <button
                key={code}
                type="button"
                aria-pressed={isActive}
                onClick={() => switchTo(code)}
                className={
                  isActive
                    ? "inline-flex min-w-[6.5rem] flex-col items-start gap-0.5 rounded-xl border border-blue-500/60 bg-blue-600/20 px-4 py-3 text-left transition-colors"
                    : "inline-flex min-w-[6.5rem] flex-col items-start gap-0.5 rounded-xl border border-slate-600 bg-slate-950/50 px-4 py-3 text-left transition-colors hover:border-slate-500 hover:bg-slate-800/60"
                }
              >
                <span
                  className={
                    isActive
                      ? "text-xs font-bold tracking-wide text-blue-300"
                      : "text-xs font-bold tracking-wide text-slate-400"
                  }
                >
                  {localeCode(code)}
                </span>
                <span
                  className={
                    isActive ? "text-sm font-semibold text-white" : "text-sm font-medium text-slate-300"
                  }
                >
                  {getLocaleLabel(code)}
                </span>
              </button>
            );
          })}
        </div>
        {hint ? <p className="mt-3 text-xs text-slate-500">{hint}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={className}
      role="group"
      aria-label={label}
    >
      <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {activeLocales.map((code) => {
          const isActive = code === locale;
          return (
            <li key={code}>
              <button
                type="button"
                aria-current={isActive ? "true" : undefined}
                className={
                  isActive
                    ? "text-[0.6875rem] font-semibold text-[#2563eb] sm:text-sm dark:text-[#60a5fa]"
                    : "text-[0.6875rem] font-medium text-[#64748b] transition-colors hover:text-[#2563eb] sm:text-sm dark:text-[#94a3b8] dark:hover:text-[#60a5fa]"
                }
                onClick={() => switchTo(code)}
              >
                {getLocaleLabel(code)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
