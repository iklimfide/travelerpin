import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./config";

/**
 * Locale routing for the App Router.
 * EN is default (no prefix). Optional locales use `/tr`, `/es`, …
 * `localeDetection: true` uses Accept-Language on first visit (e.g. TR browser → `/tr`),
 * then remembers the choice via the NEXT_LOCALE cookie.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: true,
});
