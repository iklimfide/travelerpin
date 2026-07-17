"use client";

import { useLocale } from "next-intl";
import {
  activeLocales,
  getLocaleLabel,
  type Locale,
} from "@/lib/i18n/config";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

type Props = {
  className?: string;
  /** Accessible name for the control group. */
  label?: string;
};

/**
 * Switches locale while preserving the current pathname (no Accept-Language redirect).
 * Ready for more locales once they are added to `activeLocales`.
 */
export function LocaleSwitcher({ className, label = "Language" }: Props) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

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
                onClick={() => {
                  if (!isActive) {
                    router.replace(pathname, { locale: code });
                  }
                }}
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
