/**
 * App locales. Add `"es"` here when Spanish ships — keep messages, legal, and
 * place-name overrides in sync (see docs / locale checklist).
 */
export const locales = ["en", "tr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

/** Locales that are selectable in the product UI today. */
export const activeLocales = ["en", "tr"] as const satisfies readonly Locale[];

/** Planned locales — shown as coming soon or omitted from the switcher. */
export const upcomingLocales = ["es"] as const;

const intlLocaleByAppLocale: Record<Locale, string> = {
  en: "en-US",
  tr: "tr-TR",
};

const localeLabels: Record<Locale | (typeof upcomingLocales)[number], string> = {
  en: "English",
  tr: "Türkçe",
  es: "Español",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** BCP 47 locale for Intl (month names, date formatting). */
export function getIntlLocale(locale: Locale = defaultLocale): string {
  return intlLocaleByAppLocale[locale] ?? locale;
}

export function getLocaleLabel(locale: Locale | (typeof upcomingLocales)[number]): string {
  return localeLabels[locale] ?? locale;
}
