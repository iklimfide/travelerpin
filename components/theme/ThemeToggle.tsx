"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { useAppMessages } from "@/lib/i18n/client-messages";

type ThemeToggleProps = {
  variant?: "icon" | "menu";
  className?: string;
  onToggled?: () => void;
};

function ThemeIcon({ isDark, className }: { isDark: boolean; className?: string }) {
  const { common: commonMessages } = useAppMessages();
  if (isDark) {
    return (
      <svg
        className={className}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeToggle({ variant = "icon", className = "", onToggled }: ThemeToggleProps) {
  const { common: commonMessages } = useAppMessages();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  function handleToggle() {
    toggleTheme();
    onToggled?.();
  }

  if (variant === "menu") {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={handleToggle}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
      >
        <ThemeIcon isDark={isDark} className="h-4 w-4 shrink-0 text-slate-500" />
        {isDark ? commonMessages.lightMode : commonMessages.darkMode}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? commonMessages.lightMode : commonMessages.darkMode}
      title={isDark ? commonMessages.lightMode : commonMessages.darkMode}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-white ${className}`}
    >
      <ThemeIcon isDark={isDark} />
    </button>
  );
}
